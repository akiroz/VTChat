import PgPromise from "pg-promise";

const pgp = PgPromise();
const productionMode = process.env.NODE_ENV === "production";

export const db = pgp({
    host: productionMode? "127.0.0.1": "postgres",
    database: "livechat",
    user: "livechatApp",
    password: "postgres",
    statement_timeout: 3000
});

export const workerDb = pgp({
    host: productionMode? "127.0.0.1": "postgres",
    database: "livechat",
    user: "livechatWorker",
    password: "postgres",
});