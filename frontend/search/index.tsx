import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SnackbarProvider } from "notistack";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import AppBar from "@mui/material/AppBar";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import TranslateIcon from "@mui/icons-material/Translate";

import "./i18n";
import Search from "./Search";
import Results from "./Results";
import About from "./About";
import Faq from "./Faq";

const root = createRoot(document.querySelector("main"));
const theme = createTheme({ palette: { mode: "dark" } });

const router = createHashRouter([
    { path: "/", element: <Search /> },
    { path: "/search", element: <Results /> },
    { path: "/about", element: <About /> },
    { path: "/faq", element: <Faq /> },
]);

function App() {
    const { t, i18n } = useTranslation();
    const [lng] = i18n.language.split("-");
    return (
        <Stack sx={{ height: "100vh" }}>
            <Container style={{ padding: "1rem", flex: 1 }}>
                <RouterProvider router={router} />
            </Container>
            <AppBar position="relative" >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ position: "absolute", margin: 2 }}>
                    <TranslateIcon fontSize="small" />
                    <Select size="small" value={lng} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="ja">日本語</MenuItem>
                    </Select>
                </Stack>
                <Stack alignItems="center" spacing={1} justifyContent="center" sx={{ flex: 1, margin: 1.5 }}>
                    <Typography variant="caption">
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Link underline="hover" onClick={() => router.navigate("/")} >{t("links.home")}</Link>
                            <Link underline="hover" onClick={() => router.navigate("/about")} >{t("links.about")}</Link>
                            <Link underline="hover" onClick={() => router.navigate("/faq")} >{t("links.faq")}</Link>
                            <Link underline="hover" href="https://www.iubenda.com/privacy-policy/69345174" target="_blank" rel="noreferrer" >{t("links.privacy")}</Link>
                            <Link underline="hover" href="https://www.iubenda.com/privacy-policy/69345174/cookie-policy" target="_blank" rel="noreferrer" >{t("links.cookie")}</Link>
                            <Link underline="hover" href="https://stats.uptimerobot.com/uMveGZ9t46" target="_blank" rel="noreferrer" >{t("links.systemStatus")}</Link>
                            <Link underline="hover" href="https://github.com/akiroz/VTChat" target="_blank" rel="noreferrer" >GitHub</Link>
                        </Stack>
                    </Typography>
                    <Typography variant="caption">
                        Made with ❤️ for 💎💧🍵
                    </Typography>
                </Stack>
            </AppBar>
        </Stack>
    );
}

root.render(
    <StrictMode>
        <ThemeProvider theme={theme}>
            <SnackbarProvider>
                <CssBaseline />
                <App />
            </SnackbarProvider>
        </ThemeProvider>
    </StrictMode>
);