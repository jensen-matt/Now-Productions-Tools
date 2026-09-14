import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: __dirname,
	// Served by Express under /teleprompter (see app/server.mjs) so it can
	// sit alongside the landing page and the other tools on the same port.
	base: "/teleprompter/",
	plugins: [react()],
	build: {
		outDir: path.join(__dirname, "dist"),
		emptyOutDir: true,
	},
	server: {
		proxy: {
			"/api": "http://localhost:4000",
		},
	},
});
