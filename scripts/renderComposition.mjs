// Shared render logic used by the CLI (scripts/render.mjs) and both batch
// web apps (app/server.mjs). Bundling is cached across calls within the
// same process, so a long-lived server can render many entries — of any
// registered composition — without re-bundling each time.

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

let bundleLocationPromise;

function getBundleLocation() {
	if (!bundleLocationPromise) {
		bundleLocationPromise = bundle({
			entryPoint: path.join(projectRoot, "src", "index.ts"),
		});
	}
	return bundleLocationPromise;
}

/**
 * @param {{ compositionId: string, inputProps: Record<string, unknown>, outputLocation: string, onProgress?: (progress: number) => void }} options
 */
export async function renderComposition({
	compositionId,
	inputProps,
	outputLocation,
	onProgress,
}) {
	const bundleLocation = await getBundleLocation();

	const composition = await selectComposition({
		serveUrl: bundleLocation,
		id: compositionId,
		inputProps,
	});

	await renderMedia({
		composition,
		serveUrl: bundleLocation,
		codec: "prores",
		proResProfile: "4444",
		pixelFormat: "yuva444p10le",
		imageFormat: "png",
		outputLocation,
		inputProps,
		muted: true,
		// Remotion's default concurrency spreads frames across several
		// parallel browser tabs (tied to CPU core count). Different tabs can
		// rasterize the same web-font text with tiny inconsistencies, so
		// frames that should be pixel-identical (e.g. a graphic's long
		// static hold) aren't — invisible frame-by-frame, but a visible
		// shimmer once played back as continuous video. Forcing a single
		// tab trades render speed for guaranteed frame-to-frame determinism,
		// which matters more for a short broadcast graphic than render time.
		concurrency: 1,
		onProgress: onProgress
			? ({ progress }) => onProgress(progress)
			: undefined,
	});

	return outputLocation;
}

export { projectRoot };
