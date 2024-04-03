import { useState, useEffect } from "react";
import numeral from "numeral";
import {
    Stack, Paper, Dialog, DialogTitle, DialogActions, DialogContent, Link,
    IconButton, Typography, Tabs, Tab, Button, Box, TextField, Badge, Tooltip,
} from "@mui/material";
import { Done, ErrorOutline, Loop, AddBox, Chat, VoiceChat, OpenInNew } from "@mui/icons-material";
import { enqueueSnackbar } from "notistack";
import { formatDate } from "date-fns";

import * as API from "./api";

function JobCard({ job, onRetry }: { job: API.Job, onRetry?: (job: API.Job) => any }) {
    const stateColor = {
        started: "info" as const,
        failed: "error" as const,
        success: "success" as const,
    };
    const stale = job.state === "started" && (Date.now() - job.lastUpdate) > 60000;
    const allowRetry = stale || job.state === "failed";
    return (
        <Paper sx={{ padding: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
                {job.state ? (
                    <Tooltip title={`${job.type}: ${job.state}`} placement="top">
                        <Badge variant="dot" color={stateColor[job.state]}>
                            {job.type === "chat" ? <Chat /> : <VoiceChat />}
                        </Badge>
                    </Tooltip>
                ): job.type === "chat"? (
                    <Chat />
                ): (
                    <VoiceChat />
                )}
                <Typography>{job.video}</Typography>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Open in YouTube" placement="top">
                    <Link underline="none" href={`https://youtube.com/watch?v=${job.video}`}>
                        <OpenInNew />
                    </Link>
                </Tooltip>
            </Stack>
            {job.meta?.scheduled && (
                <Typography variant="caption">
                    Scheduled: {formatDate(job.meta?.scheduled, "yyyy-MM-dd HH:mm:ss")}
                </Typography>
            )}
            {job.state === "failed" && job.error && (
                <Typography color="error">
                    {job.error}
                </Typography>
            )}
            <Stack direction="row" alignItems="end" justifyContent="space-between" sx={{ marginTop: 1 }}>
                <Typography variant="caption" color={stale ? "yellow" : "GrayText"}>
                    Updated: {formatDate(job.lastUpdate, "yyyy-MM-dd HH:mm:ss")}
                </Typography>
                {onRetry && allowRetry && <Button variant="outlined" size="small" onClick={() => onRetry(job)}>Retry</Button>}
            </Stack>
        </Paper>
    );
}

export default function JobView() {
    const [refetch, setRefetch] = useState(false);
    const stats = API.stats({ refetch });
    const jobs = API.jobs({ refetch });
    const [newJob, setNewJob] = useState<{} | { scrape: true } | { channel: string } | { video: string }>({});
    const [submittingJob, setSubmittingJob] = useState(false);

    function reload() {
        setRefetch(true);
        stats.reload();
        jobs.reload();
    }

    const { queueLength, queued, started, failed, recent } = jobs;
    

    useEffect(() => { // Auto-reload if something updated in the last minute
        const allJobs = [...queued, ...started, ...failed, ...recent];
        const latestUpdate = allJobs.reduce((acc, j) => Math.max(acc, j.lastUpdate), 0);
        if ((Date.now() - latestUpdate) < 60000) {
            setTimeout(reload, 3000);
        }
    }, [jobs.k]);

    async function submitJob(job) {
        setSubmittingJob(true);
        try {
            await API.submitJob(job);
            jobs.reload();
            enqueueSnackbar("Job submitted");
        } catch (err) {
            enqueueSnackbar(`Failed: ${err?.message || err}`, { variant: "error" });
        } finally {
            setSubmittingJob(false);
            setNewJob({});
        }
    }

    return (
        <Stack spacing={2} direction="row">
            <Dialog open={!!Object.keys(newJob).length} onClose={() => setNewJob({})}>
                <DialogTitle>Submit Job</DialogTitle>
                <DialogContent>
                    <Box sx={{ borderBottom: 1, borderColor: "divider", marginBottom: "1rem" }}>
                        <Tabs value={Object.keys(newJob)[0] || "video"} onChange={(_e, tab) => setNewJob({ [tab]: "" } as any)}>
                            <Tab value="video" label="Index Video" />
                            <Tab value="channel" label="Scrape Channel" />
                            <Tab value="scrape" label="Trigger Scrape" />
                        </Tabs>
                    </Box>
                    {"video" in newJob && (
                        <TextField label="Video ID" disabled={submittingJob} value={newJob.video}
                            onChange={(e) => setNewJob({ video: e.target.value })} sx={{ width: "100%" }} />
                    )}
                    {"channel" in newJob && (
                        <TextField label="Channel ID" disabled={submittingJob} value={newJob.channel}
                            onChange={(e) => setNewJob({ channel: e.target.value })} sx={{ width: "100%" }} />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button disabled={submittingJob} onClick={() => {
                        if ("scrape" in newJob) newJob.scrape = true;
                        submitJob(newJob);
                    }}>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
            <Stack spacing={1} sx={{ flex: 1 }}>
                <Paper sx={{ height: 60 }} elevation={3}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%", padding: 2 }}>
                        <Loop />
                        <Typography>Queue ({queueLength})</Typography>
                        <Box sx={{ flex: 1 }} />
                        <IconButton onClick={() => setNewJob({ video: "" })} sx={{ justifySelf: "flex-end" }}>
                            <AddBox />
                        </IconButton>
                    </Stack>
                </Paper>
                {[...started, ...queued].map(j => <JobCard key={`${j.type}-${j.video}`} job={j} onRetry={(j) => submitJob({ video: j.video })} />)}
            </Stack>
            <Stack spacing={1} sx={{ flex: 1 }}>
                <Paper sx={{ height: 60 }} elevation={3}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%", padding: 2 }}>
                        <ErrorOutline />
                        <Typography>Failed</Typography>
                    </Stack>
                </Paper>
                {failed.map(j => <JobCard key={`${j.type}-${j.video}`} job={j} onRetry={(j) => submitJob({ video: j.video })} />)}
            </Stack>
            <Stack spacing={1} sx={{ flex: 1 }}>
                <Paper sx={{ height: 60 }} elevation={3}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%", padding: 2 }}>
                        <Done />
                        <Typography>Recent</Typography>
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="caption" align="left" color="GrayText" sx={{ justifySelf: "flex-end" }}>
                            <code>
                                Job/Msgs: {numeral(stats.count.job).format("0a")}/{numeral(stats.count.msg).format("0a")}
                                <br />
                                Size: {numeral(stats.size.db).format("0.0b")}
                            </code>
                        </Typography>
                    </Stack>
                </Paper>
                {recent.map(j => <JobCard key={`${j.type}-${j.video}`} job={j} />)}
            </Stack>
        </Stack>
    );
}