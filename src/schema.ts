import { z } from "zod";

export const lowerThirdSchema = z.object({
	name: z.string(),
	title: z.string(),
	// Empty string = single title line. Non-empty = second title line below the first.
	title2: z.string(),
	// Plate width in px. Leave unset to auto-fit the content (default).
	width: z.number().min(200).max(1700).optional(),
});

export type LowerThirdProps = z.infer<typeof lowerThirdSchema>;

export const titleCardSchema = z.object({
	title: z.string(),
	// Empty string = no subtitle line.
	subtitle: z.string(),
});

export type TitleCardProps = z.infer<typeof titleCardSchema>;

export const outroCardSchema = z.object({
	heading: z.string(),
	// Empty string = no subtext line.
	subtext: z.string(),
});

export type OutroCardProps = z.infer<typeof outroCardSchema>;

export const quoteCardSchema = z.object({
	quote: z.string(),
	// Both empty = no attribution block.
	name: z.string(),
	title: z.string(),
});

export type QuoteCardProps = z.infer<typeof quoteCardSchema>;
