import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Container, Tabs, Tab, Box } from "@mui/material";
import { SnackbarProvider } from "notistack";

import JobView from "./JobView";
import ChannelView from "./ChannelView";

const root = createRoot(document.querySelector("main"));
const theme = createTheme({ palette: { mode: "dark" } });

function App() {
    const [tab, setTab] = useState("job");
    return (
        <Container style={{ padding: "1rem" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", marginBottom: "1rem" }}>
                <Tabs value={tab} onChange={(_e, val) => setTab(val)}>
                    <Tab value="job" label="Jobs" />
                    <Tab value="channel" label="Channels" />
                </Tabs>
            </Box>
            {tab === "job" && <JobView/>}
            {tab === "channel" && <ChannelView/>}
        </Container>
    );
}

root.render(
    <ThemeProvider theme={theme}>
        <SnackbarProvider>
            <CssBaseline />
            <App />
        </SnackbarProvider>
    </ThemeProvider>
);