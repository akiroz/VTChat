import { useState } from "react";
import { useAsync } from "react-async-hook";
import { useTranslation } from "react-i18next";
import { useNavigate, createSearchParams } from "react-router-dom";
import { useDebounce } from "use-debounce";
import { produce } from "immer";

import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import * as API from "./api";

async function csearch(q: string): ReturnType<typeof API.csearch> {
    if (q.length < 2) return [];
    return API.csearch({ q });
}

export default function Search() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const tags = useAsync(API.tags, []);

    const [chQuery, setChQuery] = useState("");
    const [chQuery2] = useDebounce(chQuery, 800);
    const channels = useAsync(csearch, [chQuery2]);

    const [search, setSearch] = useState<{ q: string, ch?: string, tag?: string, before?: number }>({ q: "" });

    return (
        <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: "100%" }}>
            <Typography variant="h3">VTChat</Typography>
            <Typography variant="subtitle1">{t("desc")}</Typography>
            <Box />
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: 600 }}>
                <TextField label={t("keyword")} sx={{ width: "100%" }} value={search.q}
                    onChange={e => setSearch({ ...search, q: e.target.value })} />
                <Button variant="contained" disabled={search.q.length < 2} onClick={() => {
                    const { before, ...rest } = search;
                    const params = { ...rest, ...(Number.isInteger(before)? { bf: String(before) }: {}) };
                    navigate({ pathname: "/search", search: createSearchParams(params).toString() });
                }}>
                    {t("search")}
                </Button>
            </Stack>
            <Accordion sx={{ width: 600 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    {t("advancedSearch")}
                </AccordionSummary>
                <AccordionDetails>
                    <Autocomplete
                        options={(chQuery.length > 1 && channels.result) || []}
                        loading={channels.loading}
                        isOptionEqualToValue={(a, b) => a?.id === b?.id}
                        onChange={(_e, value) => {
                            setSearch(produce(search, d => {
                                delete d.ch;
                                if(value?.id) d.ch = value.id;
                            }));
                        }}
                        filterOptions={(x) => x}
                        onInputChange={(_e, value) => setChQuery(value || "")}
                        getOptionLabel={c => c.name}
                        renderInput={(props) => <TextField {...props} label={t("channel")} />}
                        renderOption={(props, option) => (
                            <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props} key={option.id}>
                                <Avatar src={option.thumbnail} sx={{ width: 32, height: 32 }} />
                                <Typography sx={{ marginLeft: 2 }}>{option.name}</Typography>
                            </Box>
                        )}
                    />
                    <Autocomplete
                        options={tags.result || []}
                        sx={{ marginTop: 2, }}
                        value={search.tag || null}
                        onChange={(_e, value) => setSearch({ ...search, tag: value })}
                        renderInput={(props) => <TextField {...props} label={t("tags")} />}
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            sx={{ marginTop: 2 }}
                            value={search.before ? new Date(search.before * 1000) : null}
                            onChange={(val) => setSearch({ ...search, before: Math.floor(val.getTime() / 1000) })}
                            label={t("beforeDate")}
                        />
                    </LocalizationProvider>
                </AccordionDetails>
            </Accordion>
        </Stack>
    );
}