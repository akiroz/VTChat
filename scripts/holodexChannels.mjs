import { setTimeout as timeout } from "node:timers/promises";
import { writeFile } from "node:fs/promises";

const out = {};

for(const org of ["Hololive", "idol Corp", "Nijisanji", "Production Kawaii", "Phase Connect", "PRISM", "VSpo", "Varium"]) {
    const channels = [];
    while(1) {
        const url = new URL("https://holodex.net/api/v2/channels");
        const param = new URLSearchParams(Object.entries({
            type: "vtuber",
            offset: channels.length,
            limit: 50,
            org,
        }));
        url.search = param.toString();
        console.log("Hit:", url.toString());
        const res = await fetch(url.toString(), {
            method: "GET",
            headers: { "X-APIKEY": process.env.KEY },
        });
        const payload = await res.json();
        channels.push(...payload.map(({ id, inactive }) => ({ id, active: !inactive })));
        if(payload.length < 50) break;
        await timeout(2000);
    }
    out[org] = channels;
    console.log(org, channels.length);
}

await writeFile("dex.json", JSON.stringify(out));