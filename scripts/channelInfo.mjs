import { inspect } from "node:util";
import { youtube as Youtube } from "@googleapis/youtube";

const auth = process.env.VTCHAT_YT_KEY || (() => { throw Error("VTCHAT_YT_KEY not set") })();
const yt = Youtube({ version: "v3", auth });

// const { data } = await yt.channels.list({ forHandle: "@KamishiroKurea", part: ["contentDetails"] });
// const { data } = await yt.playlistItems.list({ playlistId: "UUBQd84IW8OvM8H5jftHdvmw", part: ["contentDetails"] });

console.log(inspect(data, { compact: true, depth: null, colors: true }));
