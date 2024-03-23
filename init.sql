create table "channel" (
    "id" text primary key,
    "name" text not null,
    "lastScrape" timestamp
);

create type "msgType" as enum (
    'chat',
    'transcript'
);

create table "msg" (
    "id" text primary key,
    "type" "msgType" not null,
    "video" text not null,
    "channel" text not null references "channel"("id"),
    "text" text not null,
    "vec" tsvector not null
);