import { createLogger, format, transports } from "winston";

const productionMode = process.env.NODE_ENV === "production";

export default function({ label }) {
    return createLogger({
        level: (process.env.NODE_ENV === "production")? "info": "debug",
        format: format.combine(
            format.label({ label }),
            format.timestamp(),
            format.colorize(),
            format.printf(({ timestamp, level, label, message, ...meta }) => {
                // Timestamp not needed in prod, logs managed by journald
                const str = productionMode?
                    `[${level}\t] ${label}: ${message}`:
                    `${timestamp} [${level}\t] ${label}: ${message}`;
                const metaStr = JSON.stringify(meta);
                return metaStr === "{}"? str: `${str} ${metaStr}`;
            }),
        ),
        transports: [new transports.Console()]
    });
}