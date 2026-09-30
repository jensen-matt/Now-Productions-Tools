#!/usr/bin/env node
// CLI: renders the LowerThird composition to a ProRes 4444 RGBA .mov.
//
//   node scripts/render.mjs --name "Matt Jensen" --title "Associate Technical Producer" \
//     [--title2 "Second line of title"] [--company "ServiceNow"] [--width 640] [--out out/lower-third.mov]

import path from "node:path";
import { projectRoot, renderComposition } from "./renderComposition.mjs";

function parseArgs(argv) {
	const args = { out: "out/lower-third.mov", title2: "", company: "" };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--name") args.name = argv[++i];
		else if (arg === "--title") args.title = argv[++i];
		else if (arg === "--title2") args.title2 = argv[++i];
		else if (arg === "--company") args.company = argv[++i];
		else if (arg === "--width") args.width = Number(argv[++i]);
		else if (arg === "--out") args.out = argv[++i];
		else {
			console.error(`Unknown argument: ${arg}`);
			process.exit(1);
		}
	}
	if (!args.name || !args.title) {
		console.error(
			'Usage: node scripts/render.mjs --name "Full Name" --title "Job Title" [--title2 "Second line"] [--company "Company"] [--width 640] [--out out/file.mov]',
		);
		process.exit(1);
	}
	return args;
}

async function main() {
	const { name, title, title2, company, width, out } = parseArgs(process.argv.slice(2));
	const outputLocation = path.isAbsolute(out) ? out : path.join(projectRoot, out);

	console.log(
		`Rendering "${name}" / "${title}"${title2 ? ` / "${title2}"` : ""}${company ? ` / "${company}"` : ""} -> ${outputLocation}`,
	);
	await renderComposition({
		compositionId: "LowerThird",
		inputProps: { name, title, title2, company, width },
		outputLocation,
		onProgress: (progress) => {
			process.stdout.write(`\rRendering: ${Math.round(progress * 100)}%`);
		},
	});

	console.log(`\nDone: ${outputLocation}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
