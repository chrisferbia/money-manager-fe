import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// No Cloudflare bindings or real sign-in are involved in this local test harness.
export default defineConfig({
	plugins: [react()],
	server: {
		host: "127.0.0.1",
		port: 5179,
		strictPort: true,
		proxy: { "/runtime-config.json": "http://127.0.0.1:8791" },
	},
});
