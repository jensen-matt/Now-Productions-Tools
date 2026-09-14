// Generic entrance/exit curves shared by every composition's animation
// timeline (LowerThird, TitleCard, OutroCard, QuoteCard) — each composition
// still defines its own timing constants (when things start/end), just
// reuses this math.

import { clamp, easeInCubic, easeOutBack, easeOutCubic } from "./easing";

export const enter = (t: number, durIn: number): number =>
	easeOutCubic(clamp(t / durIn, 0, 1));

export const exit = (t: number, exitStart: number, durOut: number): number =>
	easeInCubic(clamp((t - exitStart) / durOut, 0, 1));

export const pop = (t: number, durIn: number): number =>
	easeOutBack(clamp(t / durIn, 0, 1));
