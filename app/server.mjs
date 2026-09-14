import { execFile } from "node:child_process";
import express from "express";
import fs from "node:fs";
import mammoth from "mammoth";
import multer from "multer";
import path from "node:path";
// Importing the package's own index.js (rather than this inner module)
// runs a debug self-test on load under ESM — it has no CJS `module.parent`,
// which pdf-parse's index.js treats as "running standalone" and reacts to
// by reading a fixture PDF that doesn't exist in this project, crashing
// on startup.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { projectRoot, renderComposition } from "../scripts/renderComposition.mjs";
import { slugify } from "../scripts/slugify.mjs";

const execFileAsync = promisify(execFile);
const upload = multer({ storage: multer.memoryStorage() });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const graphicsDistDir = path.join(__dirname, "..", "graphics-app", "dist");
const teleprompterDistDir = path.join(__dirname, "..", "teleprompter-app", "dist");
const landingPath = path.join(__dirname, "landing.html");
const publicDir = path.join(__dirname, "..", "public");
const PORT = process.env.PORT || 4000;

const GRAPHIC_COMPOSITION_IDS = {
	title: "TitleCard",
	outro: "OutroCard",
	quote: "QuoteCard",
};

// Picks a sensible default filename per graphic kind when its primary
// field is blank — slugify() falls back to "untitled" on its own, but a
// kind-specific fallback makes the output folder easier to scan.
function labelForGraphic(kind, fields) {
	if (kind === "title") return fields.title || "title-card";
	if (kind === "outro") return fields.heading || "outro-card";
	if (kind === "quote") {
		return fields.name || fields.quote?.trim().split(/\s+/).slice(0, 4).join(" ") || "quote-card";
	}
	return "graphic";
}

// Relative paths resolve inside the project; absolute paths (e.g. pasted
// from Finder) are used as-is, so people can save straight into a
// Premiere/Resolve project's media folder elsewhere on disk.
function resolveOutputDir(outputDir) {
	const trimmed = typeof outputDir === "string" ? outputDir.trim() : "";
	const dir = trimmed || "out";
	return path.isAbsolute(dir) ? dir : path.join(projectRoot, dir);
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

app.post("/api/render", async (req, res) => {
	const { name, title, title2, width, outputDir } = req.body ?? {};

	if (typeof name !== "string" || !name.trim()) {
		res.status(400).json({ error: "name is required" });
		return;
	}
	if (typeof title !== "string" || !title.trim()) {
		res.status(400).json({ error: "title is required" });
		return;
	}

	const resolvedDir = resolveOutputDir(outputDir);

	try {
		fs.mkdirSync(resolvedDir, { recursive: true });
	} catch (err) {
		res.status(400).json({
			error: `Can't write to "${resolvedDir}": ${err instanceof Error ? err.message : String(err)}`,
		});
		return;
	}

	const outputLocation = uniqueOutputPath(resolvedDir, name);

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
				width: typeof width === "number" && Number.isFinite(width) ? width : undefined,
			},
			outputLocation,
			onProgress: (progress) => {
				res.write(JSON.stringify({ type: "progress", progress }) + "\n");
			},
		});
		res.write(
			JSON.stringify({
				type: "done",
				outputPath: outputLocation,
			}) + "\n",
		);
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
	const { kind, fields, outputDir } = req.body ?? {};

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

	const resolvedDir = resolveOutputDir(outputDir);

	try {
		fs.mkdirSync(resolvedDir, { recursive: true });
	} catch (err) {
		res.status(400).json({
			error: `Can't write to "${resolvedDir}": ${err instanceof Error ? err.message : String(err)}`,
		});
		return;
	}

	const outputLocation = uniqueOutputPath(resolvedDir, labelForGraphic(kind, fields));

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
		res.write(
			JSON.stringify({
				type: "done",
				outputPath: outputLocation,
			}) + "\n",
		);
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

app.post("/api/choose-folder", async (_req, res) => {
	if (process.platform !== "darwin") {
		res.status(501).json({
			error: "Native folder picker is only available on macOS. Type the path instead.",
		});
		return;
	}

	try {
		const { stdout } = await execFileAsync("osascript", [
			"-e",
			'POSIX path of (choose folder with prompt "Choose a folder to save renders")',
		]);
		res.json({ path: stdout.trim() });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes("-128")) {
			// User clicked Cancel in the dialog — not an error.
			res.json({ cancelled: true });
		} else {
			res.status(500).json({ error: message });
		}
	}
});

app.get("/", (_req, res) => {
	res.sendFile(landingPath);
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
