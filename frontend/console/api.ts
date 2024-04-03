declare const __VTCHAT_API_BASE__: string;

function apiUrl(endpoint: string) {
    return (new URL(endpoint, __VTCHAT_API_BASE__)).toString();
}

export async function tags(): Promise<{ tags: string[] }> {
    const resp = await fetch(apiUrl("/api/tags"));
    if(resp.status >= 400) throw Error((await resp.text()) || resp.statusText);
    return resp.json();
}

export async function stats(): Promise<{
    size: {
        db: string, // bigint
    }
    count: {
        channel: number,
        job: number,
        msg: number,
    },
}> {
    const resp = await fetch("/mgnt/stats");
    if(resp.status >= 400) throw Error((await resp.text()) || resp.statusText);
    return resp.json();
}

export async function csearch(params: { q?: string, limit?: number, offset?: number }): Promise<Array<{
    id: string,
    name: string,
    thumbnail: string,
    tags: { [tag: string]: 1 },
    active: boolean,
}>> {
    const resp = await fetch(apiUrl("/api/csearch"), {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    if(resp.status >= 400) throw Error((await resp.text()) || resp.statusText);
    const { channels } = await resp.json();
    return channels;
}

export async function updateChannels(channels: { [id: string]: { active?: boolean, tags?: { [tag: string]: 1 } } }) {
    const resp = await fetch("/mgnt/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
    });
    if(resp.status >= 400) throw Error((await resp.text()) || resp.statusText);
}

export type Job = {
    type: "chat" | "transcript",
    video: string,
    state: null | "started" | "failed" | "success",
    lastUpdate: number,
    meta?: { [k: string]: any },
    error?: string
};

export async function jobs(): Promise<{
    queueLen: string, // bigint
    started: Job[],
    failed: Job[],
    queued: Job[],
    recent: Job[],
}> {
    const resp = await fetch("/mgnt/jobs");
    if(resp.status >= 400) throw Error((await resp.text()) || resp.statusText);
    return resp.json();
}

export async function submitJob(spec: { scrape: true } | { channel: string } | { video: string }) {
    const resp = await fetch("/mgnt/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
    });
    if(resp.status >= 400) throw Error((await resp.text()) || resp.statusText);
}