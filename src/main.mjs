import { setTimeout as timeout } from "node:timers/promises";

if(process.env.NODE_ENV !== "production") {
    console.log("###########################################");
    console.log("##  WARNING: VTChat in Development Mode  ##");
    console.log("###########################################");
    await timeout(1200); // wait for DB startup
}

import * as Ingestion from "./ingestion.mjs";
import * as Api from "./api.mjs";

const worker = await Ingestion.init();
const server = await Api.init();