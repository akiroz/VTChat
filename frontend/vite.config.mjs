import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
    const { APP } = process.env;
    return {
        plugins: [react(), viteTsconfigPaths()],
        root: APP || "search",
        base: APP === "console"? "/mgnt/": "/vtchat/",
        define: {
            __VTCHAT_API_BASE__: JSON.stringify(mode === "production"? "https://vtchat.akiroz.life": "https://vtchat.akiroz.life"),
        },
        build: {
            outDir: `../dist_${APP || "search"}`,
        },
        server: {
            proxy: {
                "/mgnt/stats": 'http://localhost:3000',
                "/mgnt/jobs": 'http://localhost:3000',
                "/mgnt/channels": 'http://localhost:3000',
            }
        },
    };
})