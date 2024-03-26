import { setTimeout as timeout } from "node:timers/promises";
import { EventEmitter } from "node:events";
import GraphileWorker from "graphile-worker";
import Knex from "knex";
import { youtube as Youtube } from "@googleapis/youtube";

import { Masterchat, MasterchatError, stringify as chatStringify } from "@stu43005/masterchat";

import { db, workerDb } from "./db.mjs";
import Logger from "./logger.mjs";

const log = Logger({ label: "ingestion" });
const knex = Knex({ client: "pg" });
export const yt = Youtube({ version: "v3", auth: process.env.VTCHAT_YT_KEY || (() => { throw Error("VTCHAT_YT_KEY not set") })() });

/** @param {{ [idOrHandle: string]: { tags?: { [tag: string]: 1 }, active?: boolean } }} channels  */
export async function updateChannelInfo(channels) {
    const channelById = {};
    const channelByHandle = {};
    for (const [handleOrId, { tags, active }] of Object.entries(channels)) {
        if (handleOrId.startsWith("UC")) channelById[handleOrId] = { tags, active };
        if (handleOrId.startsWith("@")) channelByHandle[handleOrId] = { tags, active };
    }

    function parseResource(ch) {
        const id = ch?.id;
        const nameNative = ch?.snippet?.title;
        const nameAll = Object.values(ch?.localizations || {}).map(l => l.title || "").join(" ").trim() || nameNative;
        const thumbnail = ch?.snippet?.thumbnails?.default?.url;
        const uploadList = ch?.contentDetails?.relatedPlaylists?.uploads;
        if (!(id && nameNative && nameAll && thumbnail && uploadList)) {
            throw Error("failed to get channel name/thumbnail");
        }
        return { id, nameNative, nameAll, thumbnail, uploadList };
    }

    const part = ["id", "snippet", "contentDetails", "localizations"];
    if (Object.keys(channelById).length > 0) {
        const resourceById = {};
        const { data: { items = [] } } = await yt.channels.list({ id: Object.keys(channelById), part }, { http2: true });
        items.map(parseResource).forEach(({ id, ...info }) => resourceById[id] = info);
        for (const id of Object.keys(channelById)) {
            if (!resourceById[id]) throw Object.assign(Error("channel not found"), { id });
            channelById[id] = { ...channelById[id], ...resourceById[id] };
        }
    }
    for (const handle of Object.keys(channelByHandle)) {
        const { data: { items = [] } } = await yt.channels.list({ forHandle: handle, part }, { http2: true });
        if (!items.length === 1) throw Object.assign(Error("multiple results for handle"), { handle });
        const { id, ...info } = parseResource(items[0]);
        log.info("resolved channel for handle", { channel: id, handle });
        channelById[id] = { ...channelByHandle[handle], ...info };
    }

    for (const [id, { nameNative, nameAll, thumbnail, uploadList, tags, active }] of Object.entries(channelById)) {
        const { sql, bindings } = knex("channel")
            .insert({
                id, nameNative, nameAll, thumbnail, uploadList,
                tags: tags || {},
                active: active || true
            })
            .onConflict("id").merge({
                nameNative, nameAll, thumbnail, uploadList,
                ...(tags ? { tags } : {}),
                ...(typeof active === "boolean" ? { active } : {})
            })
            .toSQL().toNative();
        await db.none(sql, bindings);
    }
}

/** @type {GraphileWorker.WorkerEvents} */
const workerEv = new EventEmitter();

const taskType = {
    "scrapeVideoChat": "chat",
};

workerEv.on("job:start", ({ job }) => {
    if (!(job.task_identifier in taskType)) return;
    db.none(`update "job" set "state" = 'started', "lastUpdate" = now() where "type" = $(type) and "video" = $(video)`, {
        type: taskType[job.task_identifier],
        video: job.payload.video,
    });
});

workerEv.on("job:error", ({ job, error }) => {
    if (!(job.task_identifier in taskType)) return;
    const hasMsg = typeof error?.message === "string";
    db.none(`update "job" set "error" = $(error), "meta" = $(meta), "lastUpdate" = now() where "type" = $(type) and "video" = $(video)`, {
        type: taskType[job.task_identifier],
        video: job.payload.video,
        error: hasMsg ? error.message : "",
        meta: error,
    });
});

workerEv.on("job:complete", ({ job, error }) => {
    if (!(job.task_identifier in taskType)) return;
    db.none(`update "job" set "state" = $(state), "lastUpdate" = now() where "type" = $(type) and "video" = $(video)`, {
        type: taskType[job.task_identifier],
        video: job.payload.video,
        state: error? "failed" : "success",
    });
});

export async function init() {
    log.info("init");

    const { NODE_ENV } = process.env;
    const worker = await GraphileWorker.run({
        concurrency: 1,
        pgPool: workerDb.$pool,
        events: workerEv,
        parsedCronItems: GraphileWorker.parseCronItems(NODE_ENV !== "production"? []: [
            {
                task: "scrapeTrigger",
                match: "*/10 * * * *",
                options: { maxAttempts: 1 }
            }
        ]),
        taskList: {
            async scrapeTrigger(_payload, { addJob }) {
                const channel = await db.oneOrNone(`select * from "getOldestChannel"()`);
                if (!channel) {
                    log.warn("no channel to scrape");
                    return;
                }
                await addJob("scrapeChannel", { channel: channel.id, uploadList: channel.uploadList }, { maxAttempts: 3 });
            },

            /** @param {{ channel: string, uploadList: string }} payload */
            async scrapeChannel({ channel, uploadList }, { addJob }) {
                try {
                    await updateChannelInfo({ [channel]: {} });
                } catch (err) {
                    log.warn(err?.message || err, { channel });
                }

                let videoAdded = 0;
                let latestStream = 0;
                for (let pageToken; ;) {
                    log.debug(`fetch pl`, { id: uploadList, pageToken });
                    const { data: { items: plItems = [], nextPageToken } } = await yt.playlistItems.list({
                        playlistId: uploadList, pageToken, maxResults: 50, part: ["contentDetails"]
                    }, { http2: true });

                    const plVideos = plItems.filter(i => i.contentDetails?.videoId).map(i => i.contentDetails);
                    if (plVideos.length < 1) break;

                    let latestIndexed = await db.oneOrNone(`select 1 from "job" where "type" = 'chat' and "video" = $1`, [plVideos[0].videoId]);
                    if (latestIndexed) {
                        log.debug("latest pl item indexed", { video: plVideos[0].videoId, published: plVideos[0].videoPublishedAt });
                        break;
                    }

                    const { data: { items: vItems = [] } } = await yt.videos.list({
                        maxResults: 50, id: plVideos.map(v => v.videoId), part: ["id", "liveStreamingDetails"],
                    }, { http2: true });

                    const vStreams = vItems.filter(i => i.liveStreamingDetails?.actualEndTime)
                        .map(({ id, liveStreamingDetails: { actualStartTime, actualEndTime } }) => ({
                            id,
                            startTime: Date.parse(actualStartTime),
                            endTime: Date.parse(actualEndTime)
                        }));
                    vStreams.sort((a, b) => b.endTime - a.endTime);

                    for (const { id, startTime, endTime } of vStreams) {
                        latestStream = Math.max(latestStream, endTime);
                        const recent = (endTime + 86_400_000) > Date.now();
                        const dayAfter = new Date(endTime + 86_400_000);
                        if (recent) log.info(`recent video`, { video: id, scheduled: dayAfter });

                        const { sql, bindings } = knex("job")
                            .insert({ type: "chat", video: id, channel, meta: recent ? { scheduled: dayAfter } : null })
                            .onConflict().ignore().toSQL().toNative();
                        const { rowCount } = await db.result(sql, bindings);
                        if (rowCount < 1) break; // Video already indexed
                        else videoAdded += 1;

                        await addJob("scrapeVideoChat", { video: id, channel, startTime }, {
                            runAt: recent ? dayAfter : undefined,
                            jobKey: id,
                        });
                    }

                    if (!nextPageToken) break;
                    pageToken = nextPageToken;
                    await timeout(1000);
                }

                if (latestStream > 0) {
                    const lastStream = new Date(latestStream);
                    const { sql, bindings } = knex("channel")
                        .where({ id: channel })
                        .andWhere(b => b.where("lastStream", "<", lastStream).orWhereNull("lastStream"))
                        .update({ lastStream }).toSQL().toNative();
                    await db.none(sql, bindings);
                }
                if (videoAdded > 0) log.info(`added ${videoAdded} video`, { channel });
            },

            /** @param {{ video: string, channel: string, startTime: number }} payload */
            async scrapeVideoChat({ video, channel, startTime }) {
                try {
                    const chat = new Masterchat(video, channel, { mode: "replay" });
                    let msgAdded = 0;
                    for await (const { actions } of chat.iterate()) {
                        for (const { id, type, timestamp, message } of actions) {
                            if (type !== "addChatItemAction") continue;
                            const t = timestamp.getTime();
                            const { sql, bindings } = knex("msg").insert({
                                id,
                                type: "chat",
                                video,
                                channel,
                                timestamp,
                                timecode: t < startTime ? 0 : Math.floor((t - startTime) / 1000),
                                text: chatStringify(message)
                            }).onConflict().ignore().toSQL().toNative();
                            await db.none(sql, bindings);
                            msgAdded += 1;
                        }
                    }
                    log.info(`added ${msgAdded} msg`, { video });
                } catch (err) {
                    if (err instanceof MasterchatError) {
                        log.warn("chat unavaliable", { video, code: err.code });
                        const { message, ...meta } = err;
                        const { sql, bindings } = knex("job")
                            .where({ video, type: "chat" })
                            .update({ error: message, meta })
                            .toSQL().toNative();
                        db.none(sql, bindings);
                    } else {
                        throw err;
                    }
                }
            }
        },

        logger: new GraphileWorker.Logger(() => {
            const logger = Logger({ label: "worker" });
            return (level, message) => logger.log({ level, message })
        }),
    });

    return worker;
}