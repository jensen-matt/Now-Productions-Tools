// Easing functions, ported 1:1 from the design handoff spec
// (design_handoff_lower_third_generator/animations-v2.jsx / README.md).

export const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

export const easeInCubic = (t: number): number => t * t * t;

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

const BACK_C1 = 1.70158;
const BACK_C3 = BACK_C1 + 1;

export const easeOutBack = (t: number): number =>
	1 + BACK_C3 * (t - 1) ** 3 + BACK_C1 * (t - 1) ** 2;
