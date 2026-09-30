import { ZipArchive } from "archiver";
import crypto from "node:crypto";
import express from "express";
import fs from "node:fs";
import mammoth from "mammoth";
import multer from "multer";
import os from "node:os";
import path from "node:path";
// Importing the package's own index.js (rather than this inner module)
// runs a debug self-test on load under ESM — it has no CJS `module.parent`,
// which pdf-parse's index.js treats as "running standalone" and reacts to
// by reading a fixture PDF that doesn't exist in this project, crashing
// on startup.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { fileURLToPath } from "node:url";
import { renderComposition } from "../scripts/renderComposition.mjs";
import { slugify } from "../scripts/slugify.mjs";

const upload = multer({ storage: multer.memoryStorage() });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const graphicsDistDir = path.join(__dirname, "..", "graphics-app", "dist");
const teleprompterDistDir = path.join(__dirname, "..", "teleprompter-app", "dist");
const landingPath = path.join(__dirname, "landing.html");
const toolsConfigPath = path.join(__dirname, "tools.json");
const publicDir = path.join(__dirname, "..", "public");
const PORT = process.env.PORT || 4000;

const GRAPHIC_COMPOSITION_IDS = {
	title: "TitleCard",
	outro: "OutroCard",
	quote: "QuoteCard",
};

// Renders land in the OS temp dir, not the project — the browser is the
// only place a render is meant to end up (via the client's own save-file
// picker), so there's nothing here for the project's out/ folder to
// accumulate.
const RENDER_TMP_DIR = path.join(os.tmpdir(), "nowprod-tools-renders");
fs.mkdirSync(RENDER_TMP_DIR, { recursive: true });

// token -> { filePath, filename, createdAt }. A render's result lives here
// just long enough for the browser to fetch it once; downloading it (or
// the sweep below, for anything abandoned) deletes both the entry and the
// underlying file.
const pendingDownloads = new Map();
const DOWNLOAD_TTL_MS = 30 * 60 * 1000;

function forgetDownload(token) {
	const entry = pendingDownloads.get(token);
	if (!entry) return;
	pendingDownloads.delete(token);
	fs.unlink(entry.filePath, () => {});
}

setInterval(() => {
	const cutoff = Date.now() - DOWNLOAD_TTL_MS;
	for (const [token, entry] of pendingDownloads) {
		if (entry.createdAt < cutoff) forgetDownload(token);
	}
}, 5 * 60 * 1000);

// Picks a sensible default filename per graphic kind when its primary
// field is blank — slugify() falls back to "untitled" on its own, but a
// kind-specific fallback makes downloads easier to tell apart.
function labelForGraphic(kind, fields) {
	if (kind === "title") return fields.title || "title-card";
	if (kind === "outro") return fields.heading || "outro-card";
	if (kind === "quote") {
		return fields.name || fields.quote?.trim().split(/\s+/).slice(0, 4).join(" ") || "quote-card";
	}
	return "graphic";
}

function uniqueOutputPath(dir, name) {
	const base = slugify(name);
	let candidate = `${base}.mov`;
	let n = 2;
	while (fs.existsSync(path.join(dir, candidate))) {
		candidate = `${base}-${n}.mov`;
		n += 1;
	}
	return path.join(dir, candidate);
}

const app = express();
app.use(express.json());

// Registers a finished render for one-time pickup by the browser and
// returns the token/filename the client needs to fetch and save it.
function registerDownload(outputLocation) {
	const token = crypto.randomUUID();
	pendingDownloads.set(token, {
		filePath: outputLocation,
		filename: path.basename(outputLocation),
		createdAt: Date.now(),
	});
	return { token, filename: path.basename(outputLocation) };
}

app.post("/api/render", async (req, res) => {
	const { name, title, title2, company, width } = req.body ?? {};

	if (typeof name !== "string" || !name.trim()) {
		res.status(400).json({ error: "name is required" });
		return;
	}
	if (typeof title !== "string" || !title.trim()) {
		res.status(400).json({ error: "title is required" });
		return;
	}

	const outputLocation = uniqueOutputPath(RENDER_TMP_DIR, name);

	res.writeHead(200, {
		"Content-Type": "application/x-ndjson",
		"Transfer-Encoding": "chunked",
	});

	try {
		await renderComposition({
			compositionId: "LowerThird",
			inputProps: {
				name,
				title,
				title2: typeof title2 === "string" ? title2 : "",
				company: typeof company === "string" ? company : "",
				width: typeof width === "number" && Number.isFinite(width) ? width : undefined,
			},
			outputLocation,
			onProgress: (progress) => {
				res.write(JSON.stringify({ type: "progress", progress }) + "\n");
			},
		});
		res.write(JSON.stringify({ type: "done", ...registerDownload(outputLocation) }) + "\n");
	} catch (err) {
		res.write(
			JSON.stringify({
				type: "error",
				message: err instanceof Error ? err.message : String(err),
			}) + "\n",
		);
	} finally {
		res.end();
	}
});

app.post("/api/render-graphic", async (req, res) => {
	const { kind, fields } = req.body ?? {};

	const compositionId = GRAPHIC_COMPOSITION_IDS[kind];
	if (!compositionId) {
		res.status(400).json({ error: `Unknown graphic kind: ${kind}` });
		return;
	}
	if (typeof fields !== "object" || fields === null) {
		res.status(400).json({ error: "fields is required" });
		return;
	}

	if (kind === "title" && !fields.title?.trim()) {
		res.status(400).json({ error: "title is required" });
		return;
	}
	if (kind === "outro" && !fields.heading?.trim()) {
		res.status(400).json({ error: "heading is required" });
		return;
	}
	if (kind === "quote" && !fields.quote?.trim()) {
		res.status(400).json({ error: "quote is required" });
		return;
	}

	const outputLocation = uniqueOutputPath(RENDER_TMP_DIR, labelForGraphic(kind, fields));

	res.writeHead(200, {
		"Content-Type": "application/x-ndjson",
		"Transfer-Encoding": "chunked",
	});

	try {
		await renderComposition({
			compositionId,
			inputProps: fields,
			outputLocation,
			onProgress: (progress) => {
				res.write(JSON.stringify({ type: "progress", progress }) + "\n");
			},
		});
		res.write(JSON.stringify({ type: "done", ...registerDownload(outputLocation) }) + "\n");
	} catch (err) {
		res.write(
			JSON.stringify({
				type: "error",
				message: err instanceof Error ? err.message : String(err),
			}) + "\n",
		);
	} finally {
		res.end();
	}
});

app.post("/api/parse-file", upload.single("file"), async (req, res) => {
	const file = req.file;
	if (!file) {
		res.status(400).json({ error: "file is required" });
		return;
	}

	const extension = path.extname(file.originalname).toLowerCase();

	try {
		let text;
		if (extension === ".docx") {
			const result = await mammoth.extractRawText({ buffer: file.buffer });
			text = result.value;
		} else if (extension === ".pdf") {
			const result = await pdfParse(file.buffer);
			text = result.text;
		} else {
			text = file.buffer.toString("utf8");
		}
		res.json({ text });
	} catch (err) {
		res.status(400).json({
			error: `Couldn't read "${file.originalname}": ${err instanceof Error ? err.message : String(err)}`,
		});
	}
});

// Renders live in the OS temp dir behind an opaque one-time token — the
// client never sees or picks a filesystem path, so there's no arbitrary
// path to validate here. Fetched once, then deleted; the sweep above
// catches anything the client never comes back for.
app.get("/api/download/:token", (req, res) => {
	const entry = pendingDownloads.get(req.params.token);
	if (!entry || !fs.existsSync(entry.filePath)) {
		res.status(404).json({ error: "This render has expired or was already downloaded. Render it again." });
		return;
	}
	res.download(entry.filePath, entry.filename, () => forgetDownload(req.params.token));
});

// Renders one zip containing every token passed in, for "Render all" to
// hand back as a single download instead of one file per card.
app.post("/api/download-zip", (req, res) => {
	const { tokens } = req.body ?? {};
	if (!Array.isArray(tokens) || tokens.length === 0) {
		res.status(400).json({ error: "tokens is required" });
		return;
	}

	const entries = [];
	for (const token of tokens) {
		const entry = pendingDownloads.get(token);
		if (!entry || !fs.existsSync(entry.filePath)) {
			res.status(404).json({ error: "One of these renders has expired or was already downloaded. Render again." });
			return;
		}
		entries.push({ token, ...entry });
	}

	res.setHeader("Content-Type", "application/zip");
	res.setHeader("Content-Disposition", 'attachment; filename="renders.zip"');

	const archive = new ZipArchive();
	archive.on("error", (err) => res.destroy(err));
	archive.pipe(res);

	const usedNames = new Set();
	for (const entry of entries) {
		let name = entry.filename;
		let n = 2;
		while (usedNames.has(name)) {
			name = `${path.basename(entry.filename, ".mov")}-${n}.mov`;
			n += 1;
		}
		usedNames.add(name);
		archive.file(entry.filePath, { name });
	}

	res.on("finish", () => {
		for (const entry of entries) forgetDownload(entry.token);
	});

	archive.finalize();
});

app.get("/", (_req, res) => {
	res.sendFile(landingPath);
});

// The landing page's own script fetches this to decide which tiles to
// render — editing this file (no rebuild/restart needed) is how a tool
// gets shown or hidden on the hub.
app.get("/tools.json", (_req, res) => {
	res.sendFile(toolsConfigPath);
});

// Remotion's staticFile() always resolves root-relative (e.g.
// "/gradient-navy-green.png"), regardless of the /lower-third base path
// the built app is mounted under — so the shared public/ folder needs to
// be reachable from root too, or the in-browser preview's background
// image 404s.
app.use(express.static(publicDir));

app.use("/lower-third", express.static(distDir));
app.get("/lower-third/*", (_req, res) => {
	res.sendFile(path.join(distDir, "index.html"));
});

app.use("/graphics", express.static(graphicsDistDir));
app.get("/graphics/*", (_req, res) => {
	res.sendFile(path.join(graphicsDistDir, "index.html"));
});

app.use("/teleprompter", express.static(teleprompterDistDir));
app.get("/teleprompter/*", (_req, res) => {
	res.sendFile(path.join(teleprompterDistDir, "index.html"));
});

app.listen(PORT, () => {
	console.log(`NowProductions Tools running at http://localhost:${PORT}`);
	console.log(`  Lower Third Generator:  http://localhost:${PORT}/lower-third`);
	console.log(`  Graphics Generator:     http://localhost:${PORT}/graphics`);
	console.log(`  Teleprompter Formatter: http://localhost:${PORT}/teleprompter`);
});
