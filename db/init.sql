create database "livechat";
create user "livechatApp" password 'postgres';
create user "livechatWorker" password 'postgres';
grant connect on database "livechat" to "livechatApp";
grant connect, create on database "livechat" to "livechatWorker";

\c "livechat";
create extension if not exists pgcrypto;
create extension if not exists pgroonga;
create extension if not exists timescaledb cascade;

grant select on pg_class to "livechatApp";
alter default privileges in schema "public" grant select, insert, update, delete on tables to "livechatApp";
alter default privileges in schema "public" grant execute on functions to "livechatApp";

create type "jobState" as enum (
    'started',
    'success',
    'failed'
);

create type "msgType" as enum (
    'chat',
    'transcript'
);

create table "channel" (
    "id" text primary key,
    "uploadList" text not null,
    "nameNative" text not null,
    "nameAll" text not null,
    "thumbnail" text not null,
    "tags" jsonb not null default '{}', -- object where keys are string tags, values always 1
    "active" boolean not null default true,
    "lastUpdate" timestamp,
    "lastStream" timestamp
);

create index on "channel" using btree ("lastUpdate" asc nulls first); -- get oldest
create index on "channel" using btree ("nameNative"); -- for pagination ordering
create index on "channel" using pgroonga ("nameAll");

create table "job" (
    "type" "msgType" not null,
    "video" text not null,
    "channel" text not null references "channel"("id"),
    "lastUpdate" timestamp not null default now(),
    "state" "jobState",
    "error" text,
    "meta" jsonb,
    primary key ("video", "type")
);

create index on "job" using btree ("lastUpdate" desc);
create index on "job" using btree ("state");

create table "msg" (
    "id" text not null,
    "type" "msgType" not null,
    "video" text not null,
    "channel" text not null references "channel"("id"),
    "timestamp" timestamp not null,
    "timecode" int not null, -- sec, relative to start of video
    "text" text not null,
    primary key ("id", "timestamp")
);

select create_hypertable('msg', 'timestamp', chunk_time_interval => interval '7 day', migrate_data => true);
create index on "msg" using btree ("timestamp");
create index on "msg" using hash ("channel");
create index on "msg" using pgroonga ("text");

----------------------------------------------------------------

create function "getOldestChannel"()
returns table ("id" text, "uploadList" text, "lastUpdate" timestamp) as $$
    with o as (select * from "channel" where "active" = true order by "lastUpdate" asc nulls first limit 1)
    update "channel" set "lastUpdate" = now() from o where "channel"."id" = o."id"
    returning o."id", o."uploadList", o."lastUpdate";
$$ language sql;

create function jsonb_merge(a jsonb, b jsonb) returns jsonb as $$
    select a || b;
$$ language sql; 

create aggregate jsonb_merge_agg(jsonb) (
    sfunc = jsonb_merge,
    stype = jsonb,
    initcond = '{}'
);
