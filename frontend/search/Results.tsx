
import { useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAsync } from "react-async-hook";
import { useTranslation } from "react-i18next";
import { enqueueSnackbar } from "notistack";
import YTPlayer from "react-youtube";
import numeral from "numeral";
import * as  DateFns from "date-fns";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";

import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import ChatIcon from "@mui/icons-material/Chat";
import VoiceChatIcon from "@mui/icons-material/VoiceChat";
import SkipNext from "@mui/icons-material/SkipNext";
import SkipPrevious from "@mui/icons-material/SkipPrevious";

import * as API from "./api";

const pageSize = 100;

function Video({ id, seekTrigger }: { id: string, seekTrigger: { v: string, t: number } }) {
    const player = useRef<YTPlayer>();
    const t = useRef<number>();
    if (seekTrigger.v === id && player.current) {
        const video = player.current.getInternalPlayer();
        if (seekTrigger.t !== t.current) {
            t.current = seekTrigger.t;
            video.seekTo(seekTrigger.t, true);
        }
    }
    return <YTPlayer videoId={id} ref={player} opts={{ width: 480, height: 270 }} />
}

export default function Results() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [qs, setQs] = useSearchParams();
    const [seek, setSeek] = useState({ v: "", t: 0 });
    const [seekCount, setSeekCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState(qs.get("q"));

    const [req, page] = useMemo(() => {
        const r = {
            q: qs.get("q"),
            ch: qs.get("ch"),
            tags: qs.has("tag") ? { [qs.get("tag")]: 1 } : null,
            weekOf: qs.has("wk") ? Number(qs.get("wk")) : null,
            offset: qs.has("o") ? Number(qs.get("o")) : null,
            limit: pageSize,
        };
        if (!r.q) {
            enqueueSnackbar("Invalid search", { variant: "error" });
            navigate("/");
            return [];
        }
        if (!r.ch) delete r.ch;
        if (!r.tags) delete r.tags;
        if (!Number.isInteger(r.offset)) delete r.offset;
        if (!Number.isInteger(r.weekOf)) setSeekCount(-12);
        r.weekOf = DateFns.startOfWeek(Number.isInteger(r.weekOf)? r.weekOf: Date.now(), { weekStartsOn: 1 }).getTime();
        return [r, {
            n: Math.floor((r.offset || 0) / pageSize) + 1,
            y: DateFns.getYear(r.weekOf),
            m: DateFns.getMonth(r.weekOf) + 1,
            mmm: DateFns.format(r.weekOf, "MMM"),
            w: DateFns.getISOWeek(r.weekOf),
        }];
    }, [qs]);

    if (!req) return <></>;

    const search = useAsync(() => API.search(req), [req]);

    function prevWeek() {
        const qs2 = new URLSearchParams(qs);
        qs2.delete("o");
        const prev = DateFns.previousMonday(req.weekOf);
        qs2.set("wk", String(prev.getTime()));
        setQs(qs2);
    }
    function nextWeek() {
        const qs2 = new URLSearchParams(qs);
        qs2.delete("o");
        const next = DateFns.nextMonday(req.weekOf);
        qs2.set("wk", String(next.getTime()));
        setQs(qs2);
    }

    const resultItems = useMemo(() => {
        if (search.error) {
            enqueueSnackbar(`Search error: ${search.error}`, { variant: "error" });
            if(seekCount !== 0) setSeekCount(0);
        }
        if (!search.result) return [];
        if (seekCount !== 0 && !search.loading) {
            if(search.result.length < 1) {
                if(seekCount < 0) {
                    setTimeout(() => prevWeek(), 1000);
                    setSeekCount(Math.min(0, seekCount + 1));
                }
                if(seekCount > 0) {
                    if(DateFns.isFuture(DateFns.endOfWeek(req.weekOf, { weekStartsOn: 1 }))) {
                        setSeekCount(0);
                    } else {
                        setTimeout(() => nextWeek(), 1000);
                        setSeekCount(Math.max(0, seekCount - 1));
                    }
                }
            } else {
                setSeekCount(0);
            }
        }
        const videos = [] as string[];
        const msgsByVideo = {} as { [v: string]: typeof search.result };
        for (const msg of search.result) {
            if (!msgsByVideo[msg.video]) {
                videos.push(msg.video);
                msgsByVideo[msg.video] = [];
            }
            msgsByVideo[msg.video].push(msg);
        }
        return videos.map(id => msgsByVideo[id].reverse());
    }, [search.result]);

    return (
        <>
            <Backdrop open={search.loading || seekCount !== 0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, margin: 0 }}>
                <Stack alignItems="center">
                    <Typography variant="h5">{t("searching")}</Typography>
                    <Typography>{t("page", page)}</Typography>
                    <CircularProgress sx={{ mt: 3 }} />
                </Stack>
            </Backdrop>
            <Stack spacing={2} sx={{ paddingTop: 6 }}>
                <AppBar>
                    <Toolbar>
                        <IconButton sx={{ mr: 2 }} onClick={() => navigate("/")}><HomeIcon /></IconButton>
                        <IconButton sx={{ mr: 1 }} onClick={() => {
                            setSeekCount(-12);
                            prevWeek();
                        }}>
                            <SkipPrevious />
                        </IconButton>
                        <IconButton sx={{ mr: 1 }} onClick={() => {
                            const qs2 = new URLSearchParams(qs);
                            if((search.result?.length || 0) >= pageSize) {
                                qs2.set("o", String((req.offset || 0) + pageSize));
                            } else {
                                qs2.delete("o");
                                const prev = DateFns.previousMonday(req.weekOf);
                                qs2.set("wk", String(prev.getTime()));
                            }
                            setQs(qs2);
                        }}>
                            <NavigateBeforeIcon />
                        </IconButton>
                        <Chip sx={{ mr: 1 }} label={t("page", page)}/>
                        <IconButton sx={{ mr: 1 }} disabled={(
                            !req.offset &&
                            DateFns.isFuture(DateFns.endOfWeek(req.weekOf, { weekStartsOn: 1 }))
                        )} onClick={() => {
                            const qs2 = new URLSearchParams(qs);
                            if(req.offset) {
                                qs2.set("o", String(Math.max(0, (req.offset || 0) - pageSize)));
                            } else {
                                qs2.delete("o");
                                const next = DateFns.nextMonday(req.weekOf);
                                qs2.set("wk", String(next.getTime()));
                            }
                            setQs(qs2);
                        }}>
                            <NavigateNextIcon />
                        </IconButton>
                        <IconButton sx={{ mr: 2 }} disabled={DateFns.isFuture(DateFns.endOfWeek(req.weekOf, { weekStartsOn: 1 }))} onClick={() => {
                            setSeekCount(12);
                            nextWeek();
                        }}>
                            <SkipNext />
                        </IconButton>
                        <TextField
                            size="small" sx={{ flex: 1, mr: 2 }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            label={t("result", { n: search.result?.length || 0 })} />
                        <Button variant="contained" disabled={searchTerm.length < 1} onClick={() => {
                            const qs2 = new URLSearchParams(qs);
                            qs2.delete("o");
                            qs2.set("q", searchTerm);
                            setQs(qs2);
                        }}>
                            {t("search")}
                        </Button>
                    </Toolbar>
                </AppBar>
                {!search.loading && resultItems.length < 1 && (
                    <Typography>{t("noResult")}</Typography>
                )}
                {resultItems.map(msgList => (
                    <Paper key={msgList[0].video}>
                        <Stack direction="row" sx={{ margin: 2 }} spacing={2}>
                            <Video id={msgList[0].video} seekTrigger={seek} />
                            <Stack spacing={1} sx={{ ml: 2, maxHeight: 400, overflow: "scroll", flex: 1 }}>
                                {msgList.map((msg, idx) => (
                                    <Stack key={idx} spacing={1} alignItems="center" direction="row">
                                        {msg.type === "chat" ? <ChatIcon fontSize="small" /> : <VoiceChatIcon fontSize="small" />}
                                        <Button onClick={() => setSeek({ v: msg.video, t: msg.timecode })}>
                                            {numeral(msg.timecode).format("00:00:00")}
                                        </Button>
                                        <Typography variant="body2">{msg.text}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Stack>
                    </Paper>
                ))}
            </Stack>
        </>
    );
}