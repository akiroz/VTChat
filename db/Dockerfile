FROM groonga/pgroonga:3.1.9-alpine-16 AS pgroona
FROM timescale/timescaledb:2.14.2-pg16

# copy thirdparty lib files
COPY --from=pgroona /usr/lib/libmsgpack-c.so.? /usr/lib/
COPY --from=pgroona /usr/lib/liblz4.so.? /usr/lib/
COPY --from=pgroona /usr/lib/libzstd.so.? /usr/lib/
# copy MeCab files
COPY --from=pgroona /usr/local/etc/mecabrc /usr/local/etc/
COPY --from=pgroona /usr/local/lib/libmecab.so.? /usr/local/lib/
COPY --from=pgroona /usr/local/lib/mecab/ /usr/local/lib/mecab/
# copy Groonga lib files
COPY --from=pgroona /usr/local/etc/groonga/ /usr/local/etc/groonga/
COPY --from=pgroona /usr/local/lib/groonga/ /usr/local/lib/groonga/
COPY --from=pgroona /usr/local/lib/libgroonga.so.? /usr/local/lib/
# copy PGroonga extension files
COPY --from=pgroona /usr/local/lib/postgresql/pgroonga*.so /usr/local/lib/postgresql/
COPY --from=pgroona /usr/local/share/postgresql/extension/pgroonga* /usr/local/share/postgresql/extension/

COPY init.sql /docker-entrypoint-initdb.d/50_init.sql