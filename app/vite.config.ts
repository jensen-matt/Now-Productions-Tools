import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: __dirname,
	// Served by Express under /lower-third (see app/server.mjs) so it can
	// sit alongside the landing page at "/" on the same port.
	base: "/lower-third/",
	// Reuse the same public/ folder the Remotion project already uses, so
	// staticFile("gradient-navy-green.png") resolves identically here and
	// in Remotion Studio / the CLI render, with no duplicated asset.
	publicDir: path.join(__dirname, "..", "public"),
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
