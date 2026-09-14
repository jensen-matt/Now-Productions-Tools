import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: __dirname,
	// Served by Express under /graphics (see app/server.mjs) so it can sit
	// alongside the landing page and the Lower Third Generator on the same
	// port.
	base: "/graphics/",
	// Reuse the same public/ folder Remotion and the Lower Third app use,
	// so staticFile("gradient-navy-green.png") resolves identically here.
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
