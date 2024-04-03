import { useState } from "react";
import { useAsync } from "react-async-hook";
import { useDebounce } from "use-debounce";
import {
    Avatar, Autocomplete, Chip, Card, CardContent, CardActions, Backdrop,
    Typography, Stack, Paper, Button, TextField, Tooltip, Checkbox, IconButton,
    Table, TableBody, TableRow, TableCell, CircularProgress
} from "@mui/material";
import { Save, Close, Edit, ContentCopy, Add } from "@mui/icons-material";
import { darken, lighten, styled } from "@mui/material/styles";
import { DataGrid, GridActionsCellItem, GridBooleanCell, GridFooter } from "@mui/x-data-grid";
import { produce } from "immer";
import { dset } from "dset";
import { enqueueSnackbar } from "notistack";

import * as API from "./api";

const getBackgroundColor = (color: string, mode: string) =>
    mode === 'dark' ? darken(color, 0.7) : lighten(color, 0.7);

const getHoverBackgroundColor = (color: string, mode: string) =>
    mode === 'dark' ? darken(color, 0.6) : lighten(color, 0.6);

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    '& .vtchat-theme--edited': {
        backgroundColor: getBackgroundColor(
            theme.palette.warning.main,
            theme.palette.mode,
        ),
        '&:hover': {
            backgroundColor: getHoverBackgroundColor(
                theme.palette.warning.main,
                theme.palette.mode,
            ),
        },
    }
}));

export default function ChannelView() {
    const stats = API.stats();
    const { tags: allTags } = API.tags();
    const [pagination, setPagination] = useState({ pageSize: 10, page: 0 });

    const [q, setQ] = useState("");
    const [q2] = useDebounce(q, 800);
    const data = useAsync((q, { pageSize, page }) => {
        return API.csearch({
            limit: pageSize,
            offset: page * pageSize,
            ...(q.length > 1 ? { q, offset: 0 } : {})
        });
    }, [q2, pagination]);

    function reloadData() {
        data.reset();
        data.execute(...data.currentParams);
    }

    const [editingRow, setEditingRow] = useState<string>(null);
    const [dirty, setDirty] = useState<{
        [id: string]: {
            meta?: { name: string, thumbnail: string },
            tags?: { [tag: string]: 1 },
            active?: boolean
        }
    }>({});

    const [newTagModal, setNewTagModal] = useState<[string, { [tag: string]: 1 }]>(null);
    const [newTag, setNewTag] = useState("");

    const [newChModal, setNewChModal] = useState(false);
    const [newCh, setNewCh] = useState("");

    const [applyState, setApplyState] = useState<null | "confirm" | "submit">(null);

    return (
        <Stack spacing={1}>
            <Stack direction="row" spacing={2} alignItems="center">
                <TextField type="search" value={q} sx={{ flex: 1 }} label="Search Channel"
                    onChange={(e) => setQ(e.target.value)} disabled={!!editingRow} />
                <Button variant="outlined" onClick={() => {
                    setNewCh("");
                    setNewChModal(true);
                }}>
                    Add Channel
                </Button>
            </Stack>
            {data.error && (
                <Paper elevation={3} variant="outlined">
                    <Stack spacing={3} justifyContent="center" alignItems="center" sx={{ height: 400 }}>
                        <Typography align="center">
                            Failed to fetch channels<br />{data.error.message}
                        </Typography>
                        <Button variant="outlined" onClick={() => reloadData()}>
                            Reload
                        </Button>
                    </Stack>
                </Paper>
            )}
            <Backdrop
                open={!!newTagModal}
                onClick={() => setNewTagModal(null)}
                sx={{ color: "#FFF", zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                <Card sx={{ width: 400, padding: 2 }} onClick={e => e.stopPropagation()}>
                    <CardContent>
                        <Autocomplete
                            freeSolo options={allTags} value={newTag} clearOnBlur selectOnFocus
                            onChange={(_e, val) => setNewTag(val || "")}
                            renderInput={(params) => <TextField {...params} label="Enter new tag" />}
                        />
                    </CardContent>
                    <CardActions sx={{ justifyContent: "flex-end" }}>
                        <Button
                            disabled={!newTag}
                            onClick={() => {
                                const [id, tags] = newTagModal;
                                const d2 = produce(dirty, d => { d[id].tags ||= tags; });
                                setDirty(produce(d2, d => { dset(d, [id, "tags", newTag], 1); }));
                                setNewTagModal(null);
                            }}
                        >
                            Add Tag
                        </Button>
                    </CardActions>
                </Card>
            </Backdrop>
            <Backdrop
                open={newChModal}
                onClick={() => setNewChModal(false)}
                sx={{ color: "#FFF", zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                <Card sx={{ width: 400, padding: 2 }} onClick={e => e.stopPropagation()}>
                    <CardContent>
                        <TextField value={newCh} onChange={e => setNewCh(e.target.value)} label="Channel ID" sx={{ width: "100%" }} />
                    </CardContent>
                    <CardActions sx={{ justifyContent: "flex-end" }}>
                        <Button
                            disabled={!(newCh?.startsWith("UC") || newCh?.startsWith("@"))}
                            onClick={() => {
                                setDirty(produce(dirty, d => { d[newCh] = {}; }));
                                setNewChModal(false);
                            }}
                        >
                            Add Channel
                        </Button>
                    </CardActions>
                </Card>
            </Backdrop>
            <Backdrop
                open={!!applyState}
                onClick={() => applyState === "confirm" && setApplyState(null)}
                sx={{ color: "#FFF", zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                {applyState === "confirm" && (
                    <Card sx={{ padding: 2 }} onClick={e => e.stopPropagation()}>
                        <CardContent>
                            <Typography>Confirm changes:</Typography>
                            <Table>
                                <TableBody>
                                    {Object.entries(dirty).map(([id, { meta, ...info }]) => (
                                        <TableRow key={id}>
                                            <TableCell>
                                                {meta ? (
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Avatar src={meta.thumbnail} sx={{ width: 36, height: 36 }} />
                                                        <Stack>
                                                            <Typography>{meta.name}</Typography>
                                                            <Typography variant="caption" sx={{ color: "InactiveCaptionText" }}>{id}</Typography>
                                                        </Stack>
                                                    </Stack>
                                                ) : (
                                                    <Typography>{id}</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <code>{JSON.stringify(info)}</code>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardActions sx={{ justifyContent: "flex-end" }}>
                            <Button onClick={async () => {
                                setApplyState("submit");
                                const chEntries = Object.entries(dirty).map(([id, { meta, ...info }]) => [id, info]);
                                try {
                                    await API.updateChannels(Object.fromEntries(chEntries));
                                    setDirty({});
                                    reloadData();
                                    enqueueSnackbar("Changes applied");
                                } catch (err) {
                                    enqueueSnackbar(`Failed: ${err?.message || err}`, { variant: "error" });
                                } finally {
                                    setApplyState(null);
                                }
                            }} >
                                Apply Changes
                            </Button>
                        </CardActions>
                    </Card>
                )}
                {applyState === "submit" && (
                    <CircularProgress/>
                )}
            </Backdrop>
            {(data.loading || data.result) && (
                <StyledDataGrid
                    columns={[
                        {
                            field: "name",
                            headerName: "Channel",
                            width: 380,
                            renderCell: ({ row }) => (
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ height: "100%" }}>
                                    <Avatar src={row.thumbnail} sx={{ width: 36, height: 36 }} />
                                    <Stack>
                                        <Typography>{row.name}</Typography>
                                        <Typography variant="caption" sx={{ color: "InactiveCaptionText" }}>{row.id}</Typography>
                                    </Stack>
                                </Stack>
                            )
                        },
                        {
                            field: "tags",
                            headerName: "Tags",
                            width: 400,
                            renderCell({ id, value: tagObj }) {
                                const editing = id === editingRow;
                                function onDelete(tag) {
                                    if (!editing) return;
                                    return () => {
                                        const d2 = produce(dirty, d => { d[id].tags ||= tagObj; });
                                        setDirty(produce(d2, d => { delete d[id].tags[tag]; }))
                                    };
                                }
                                const tags = dirty[id]?.tags || tagObj;
                                return (
                                    <Stack spacing={1} direction="row" alignItems="center" flexWrap="wrap" sx={{ height: "100%" }}>
                                        {Object.keys(tags).map(t => <Chip key={t} label={t} size="small" onDelete={onDelete(t)} />)}
                                        {editing && (
                                            <IconButton size="small" onClick={() => {
                                                setNewTag("");
                                                setNewTagModal([id, tags]);
                                            }}>
                                                <Add />
                                            </IconButton>
                                        )}
                                    </Stack>
                                );
                            }
                        },
                        {
                            field: "active",
                            headerName: "Active",
                            type: "boolean",
                            renderCell(param) {
                                const { id, row } = param;
                                const dirtyActive = dirty[id]?.active;
                                const value = (typeof dirtyActive === "boolean") ? dirtyActive : row.active;
                                if (id !== editingRow) return <GridBooleanCell {...param} value={value} />;
                                return (
                                    <Stack direction="row" alignItems="center" sx={{ margin: "5px 0" }}>
                                        <Checkbox checked={value} onChange={(e) => {
                                            setDirty(produce(dirty, d => { dset(d, [id, "active"], e.target.checked); }));
                                        }} />
                                    </Stack>
                                );
                            }
                        },
                        {
                            field: "actions",
                            type: "actions",
                            getActions({ row: { id, name, thumbnail } }) {
                                const [copied, setCopied] = useState(false);
                                return id === editingRow ? [
                                    <GridActionsCellItem icon={<Close />} label="discard" onClick={() => {
                                        setDirty(produce(dirty, d => { delete d[id]; }));
                                        setEditingRow(null);
                                    }} />,
                                    <GridActionsCellItem icon={<Save />} label="save" onClick={() => {
                                        setEditingRow(null);
                                    }} />,
                                ] : [
                                    <Tooltip title={copied ? "Copied!" : `Copy ${id}`} placement="top">
                                        <GridActionsCellItem icon={<ContentCopy />} label="copy" onClick={() => {
                                            navigator.clipboard.writeText(id);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 500);
                                        }} />
                                    </Tooltip>,
                                    <GridActionsCellItem icon={<Edit />} label="edit" disabled={!!editingRow} onClick={() => {
                                        setEditingRow(id);
                                        setDirty(produce(dirty, d => { d[id] ||= { meta: { name, thumbnail } }; }));
                                    }} />,
                                ];
                            },
                        }
                    ]}
                    autoHeight
                    rows={data.result || []}
                    loading={data.loading}
                    getRowClassName={({ id }) => (id in dirty && id !== editingRow) ? "vtchat-theme--edited" : ""}
                    pageSizeOptions={[pagination.pageSize]}
                    rowCount={stats.count.channel}
                    paginationMode="server"
                    paginationModel={pagination}
                    onPaginationModelChange={setPagination}
                    disableRowSelectionOnClick
                    disableColumnMenu
                    disableColumnFilter
                    disableColumnSorting
                    disableColumnSelector
                    hideFooterPagination={!!editingRow || q2.length > 1}
                    slots={{
                        footer(props) {
                            return (
                                <Stack direction="row">
                                    <Stack
                                        direction="row" alignItems="center"
                                        sx={{ borderTop: 1, flex: 1, padding: 1 }}
                                        className="MuiDataGrid-withBorderColor"
                                    >
                                        {Object.keys(dirty).length > 0 && !editingRow && (
                                            <>
                                                <Button onClick={() => setApplyState("confirm")}>Apply</Button>
                                                <Button color="error" onClick={() => setDirty({})} >Discard</Button>
                                            </>
                                        )}
                                    </Stack>
                                    <GridFooter {...props} />
                                </Stack>

                            );
                        }
                    }}
                />
            )}
        </Stack>
    );
}