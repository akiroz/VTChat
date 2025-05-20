import { setTimeout as timeout } from "node:timers/promises";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import https from "node:https";
import Koa from "koa";
import Router from "@koa/router";
import { bodyParser } from "@koa/bodyparser";
import cors from "@koa/cors";
import responseTime from "koa-response-time";
import ratelimit from "koa-ratelimit";
import compress from "koa-compress";
import basicAuth from "koa-basic-auth";
import serve from "koa-static";
import mount from "koa-mount";
import Ajv from "ajv";
import Knex from "knex";
import { makeWorkerUtils } from "graphile-worker";
import { startOfWeek, endOfWeek } from "date-fns";

import { db, workerDb } from "./db.mjs";
import { yt, updateChannelInfo } from "./ingestion.mjs";
import Logger from "./logger.mjs";

const log = Logger({ label: "api" });
const knex = Knex({ client: "pg" });
const ajv = new Ajv();
const rateLimitState = new Map();
const uniqueIp = new Set();

const productionMode = process.env.NODE_ENV === "production";

/** @type {Promise<{ [tag: string]: 1 }>} */
let cachedTags = null;

/** @returns {typeof cachedTags} */
async function getTags() {
    if(cachedTags) return cachedTags;
    async function doGetTags() {
        const q = `select jsonb_merge_agg("tags") as "allTags" from "channel"`;
        const { allTags } = await db.one(q);
        return allTags;
    }
    return cachedTags = doGetTags();
}

function getManagementKey() {
    const { VTCHAT_MGNT_KEY } = process.env;
    if(VTCHAT_MGNT_KEY) return VTCHAT_MGNT_KEY;
    if(!productionMode) return "admin";
    const k = randomBytes(12).toString("base64url");
    log.warn(`VTCHAT_MGNT_KEY not set, using generated key: ${k}`);
    return k;
}

function getMonitoringKey() {
    const { VTCHAT_MONIT_KEY, NODE_ENV } = process.env;
    if(VTCHAT_MONIT_KEY) return VTCHAT_MONIT_KEY;
    if(!productionMode) return "monit";
    const k = randomBytes(12).toString("base64url");
    log.warn(`VTCHAT_MONIT_KEY not set, using generated key: ${k}`);
    return k;
}

/**
 * @param {import("ajv").SchemaObject} schema
 * @returns {Koa.Middleware}
 */
function paramSchema(schema) {
    const validate = ajv.compile(schema);
    return async (ctx, next) => {
        if(!validate(ctx.request.body)) {
            log.warn("invalid req", { endpoint: `${ctx.method} ${ctx.path}`, error: validate.errors });
            ctx.throw(400, "Invalid Params");
        }
        await next();
    };
}

export async function init() {
    log.info("init");

    const workerUtils = await makeWorkerUtils({ pgPool: workerDb.$pool });

    const app = new Koa({ proxy: productionMode });
    app.use(responseTime({ hrtime: true }));
    app.use(ratelimit({
        driver: "memory",
        db: rateLimitState,
        namespace: "global",
        duration: 1000,
        max: 20,
        id: (ctx) => ctx.ip,
        disableHeader: true,
        errorMessage: "Limit Exceeded",
    }));
    app.use(cors({
        origin: ctx => ctx.path.startsWith("/api/") && "*",
        allowMethods: ["GET", "POST"]
    }));

    const api = new Router({ prefix: "/api" });
    api.use(ratelimit({
        driver: "memory",
        db: rateLimitState,
        namespace: "api",
        duration: 5000,
        max: 10,
        id: (ctx) => ctx.ip,
        disableHeader: true,
        errorMessage: "Limit Exceeded",
    }));
    api.use(async (ctx, next) => {
        // Verify IP based ratelimiter is working behind reverse proxy
        // TODO: improve client identifier for people behind CG-NAT
        if(!uniqueIp.has(ctx.ip)) {
            uniqueIp.add(ctx.ip);
            log.info("new unique IP", { ip: ctx.ip });
        }
        await next();
    });
    api.use(bodyParser({ enableTypes: ["json"], jsonLimit: 1024 }));
    api.use(compress({ threshold: 1024, deflate: false }));
    app.use(api.routes());

    const mgnt = new Router({ prefix: "/mgnt" });
    mgnt.use(bodyParser({ enableTypes: ["json"] }));
    mgnt.use(compress({ threshold: 1024, deflate: false }));
    app.use(mount("/mgnt", basicAuth({ name: getManagementKey(), pass: "", realm: "vtchat_mgnt" })))
    app.use(mgnt.routes());
    app.use(mount("/mgnt", serve("/app/public")))

    const monit = new Router({ prefix: "/monit" });
    monit.use(basicAuth({ name: getMonitoringKey(), pass: "", realm: "vtchat_monit" }));
    app.use(monit.routes());


    // API Handlers -----------------------------------------------

    api.post("/search", paramSchema({
        type: "object",
        properties: {
            q: { type: "string", minLength: 1 },
            ch: { type: "string" }, // Channel ID
            tags: {
                type: "object", // Key = Tag
                additionalProperties: { const: 1 }
            },
            weekOf: { type: "integer" }, // Timestamp sec, automatically normalized to week
            limit: { type: "integer", minimum: 1, maximum: 100 },
            offset: { type: "integer", minimum: 0 },
        },
        required: ["q"],
    }), async ctx => {
        const { q, ch, tags, weekOf = Math.floor(Date.now()/1000), limit = 100, offset = 0 } = ctx.request.body;

        const b = knex("msg")
            .select("msg.type", "msg.video", "msg.channel", "msg.timecode", "msg.text")
            .whereRaw("msg.text &@ ?", q)
            .whereBetween("timestamp", [startOfWeek(weekOf * 1000), endOfWeek(weekOf * 1000)])
            .orderBy("msg.timestamp", "desc").limit(limit).offset(offset)

        if(ch) b.where({ "msg.channel": ch })
        else if(tags) {
            b.join("channel", "msg.channel", "channel.id");
            b.where("channel.tags", "?&", Object.keys(tags));
        }

        const { sql, bindings } = b.toSQL().toNative();
        const results = await db.manyOrNone(sql, bindings);
        ctx.body = { msgs: results };
    });

    api.post("/csearch", paramSchema({
        type: "object",
        properties: {
            q: { type: "string", minLength: 2 },
            limit: { type: "integer", minimum: 1, maximum: 30 },
            offset: { type: "integer", minimum: 0 },
        },
    }), async ctx => {
        const { q, limit = 10, offset = 0 } = ctx.request.body;
        const b = knex("channel")
            .select("id", { name: "nameNative" }, "thumbnail", "tags", "active")
            .orderBy("nameNative").limit(limit).offset(offset);
        if(q && q.length > 1) b.whereRaw(`"nameAll" &@ ?`, q);
        const { sql, bindings } = b.toSQL().toNative();
        ctx.body = {
            channels: await db.manyOrNone(sql, bindings)
        };
    });

    api.get("/tags", async ctx => {
        ctx.body = {
            tags: Object.keys(await getTags()),
        };
    });

    mgnt.get("/stats", async ctx => {
        const { dbSize } = await db.one(`select pg_database_size('livechat') as "dbSize"`);
        const { channelCount } = await db.one(`select count(*)::int as "channelCount" from "channel"`);
        const { jobCount } = await db.one(`select reltuples as "jobCount" from pg_class where oid = to_regclass('public.job')`);
        const { msgCount } = await db.one(`select approximate_row_count('msg') as "msgCount"`);
        ctx.body = {
            size: { db: dbSize },
            count: {
                channel: channelCount,
                job: Math.max(jobCount, 0),
                msg: Math.max(msgCount, 0),
            }
        };
    });

    mgnt.post("/channels", paramSchema({
        type: "object",
        properties: {
            channels: {
                type: "object", // Key = Channel ID / Handle
                additionalProperties: {
                    type: "object",
                    properties: {
                        tags: {
                            type: "object", // Key = Tag
                            additionalProperties: { const: 1 }
                        },
                        active: { type: "boolean" },
                    }
                }
            },
        },
        required: ["channels"],
    }), async ctx => {
        const { channels } = ctx.request.body;
        
        let containsTagUpdates = false;
        for(const [c, { tags }] of Object.entries(channels)) {
            if(tags) containsTagUpdates = true;
            if(!(c.startsWith("UC") || c.startsWith("@"))) {
                ctx.throw(400, `Invalid channel ${c}`);
                return;
            }
        }

        await updateChannelInfo(channels);
        if(containsTagUpdates) {
            cachedTags = null;
            log.info("cached tags cleared");
        }
        ctx.body = null;
    });

    mgnt.get("/jobs", async ctx => {
        /** @param {(b: knex.Knex.QueryBuilder) => any} build */
        async function jobs(build, sort = "desc") {
            const b = knex("job")
                .select("type", "video", "state", "lastUpdate", "meta")
                .orderBy("lastUpdate", sort);
            build(b);
            const jobs = await db.manyOrNone(b.toQuery());
            return jobs.map(j => ({ ...j, lastUpdate: j.lastUpdate.getTime() }));
        }
        const { count: queueLen } = await db.one(`select count(*) from "job" where "state" is null`);
        ctx.body = {
            queueLen,
            started: await jobs(b => b.where("state", "=", "started")),
            failed: await jobs(b => b.select("error").where("state", "=", "failed")),
            queued: await jobs(b => b.whereNull("state").limit(10), "asc"),
            recent: await jobs(b => b.where("state", "=", "success").limit(5)),
        };
    });

    mgnt.post("/jobs", paramSchema({
        oneOf: [
            {
                type: "object",
                properties: { scrape: { const: true } },
                required: ["scrape"],
            },
            {
                type: "object",
                properties: { channel: { type: "string" } },
                required: ["channel"],
            },
            {
                type: "object",
                properties: { video: { type: "string" } },
                required: ["video"],
            },
        ],
    }), async ctx => {
        const { scrape, channel, video } = ctx.request.body;
        if(scrape) {
            await workerUtils.addJob("scrapeTrigger", {}, { jobKey: "scrape", maxAttempts: 1 });
        }
        if(channel) {
            const { uploadList } = (await db.oneOrNone(`select "uploadList" from "channel" where "id" = $1`, channel)) || {};
            if(!uploadList) {
                ctx.throw(400, "Unknown channel");
                return;
            }
            await workerUtils.addJob("scrapeChannel", { channel, uploadList }, { jobKey: channel, maxAttempts: 1 });
        }
        if(video) {
            const { data: { items: [v] = [] } } = await yt.videos.list({ id: video, part: ["snippet", "liveStreamingDetails"] });
            const channel = v?.snippet?.channelId;
            const startTime = Date.parse(v?.liveStreamingDetails?.actualStartTime);
            if(!(channel && Number.isFinite(startTime))) {
                ctx.throw(500, "Unable to retrive video info");
                return;
            }
            const channelExists = await db.oneOrNone(`select 1 from "channel" where "id" = $1`, [channel]);
            if(!channelExists) {
                ctx.throw(400, "Video from unknown channel")
                return;
            }
            await workerUtils.addJob("scrapeVideoChat", { video, channel, startTime }, { jobKey: video, maxAttempts: 1 });
        }
        ctx.body = null;
    });

    monit.head("/api", async ctx => {
        ctx.body = null;
    });

    monit.head("/db", async ctx => {
        await db.one(`select 1`);
        ctx.body = null;
    });

    if(productionMode) {
        const { VTCHAT_API_CERT, VTCHAT_API_KEY } = process.env;
        const cert = await readFile(VTCHAT_API_CERT || (() => { throw Error("VTCHAT_API_CERT not set") })());
        const key = await readFile(VTCHAT_API_KEY || (() => { throw Error("VTCHAT_API_KEY not set") })());
        https.createServer({ cert, key }, app.callback()).listen(443);
    } else {
        let port = Number(process.env.PORT);
        if(!(Number.isInteger(port) && port > 0)) port = 3000;
        return app.listen(port, () => log.info("server started", { port }));
    }
}