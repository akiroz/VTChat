
declare const __VTCHAT_API_BASE__: string;

export function url(endpoint: string) {
    return (new URL(endpoint, __VTCHAT_API_BASE__)).toString();
}

export async function tags(): Promise<string[]> {
    const resp = await fetch(url("/api/stats"));
    if(resp.status >= 400) throw Error((await resp.text()) || resp.statusText);
    return (await resp.json()).tags;
}

export async function csearch({ q }): Promise<Array<{
    id: string,
    name: string,
    thumbnail: string,
}>> {
    const resp = await fetch(url("/api/csearch"), {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, limit: 5 }),
    });
    if(resp.status >= 400) throw Error((await resp.text()) || resp.statusText);
    const { channels } = await resp.json();
    return channels;
}

export async function search(params): Promise<Array<{
    type: "chat" | "transcript",
    video: string,
    channel: string,
    timecode: number,
    text: string,
}>> {
    const resp = await fetch(url("/api/search"), {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    if(resp.status >= 400) throw Error((await resp.text()) || resp.statusText);
    const { msgs } = await resp.json();
    return msgs;
}