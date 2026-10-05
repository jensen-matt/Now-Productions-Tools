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

// CSS-style cubic-bezier(x1, y1, x2, y2) easing, with implicit fixed
// endpoints P0=(0,0) and P3=(1,1). The bezier's control points define x(s)
// and y(s) parametrically in its own parameter s — since we want y as a
// function of x (the normalized time we're actually driving animations
// with), this solves x(s) = x for s via Newton-Raphson each call, then
// returns y(s). Unlike easeInCubic/easeOutCubic, the two control points
// don't have to mirror each other, so this can express curves those can't
// (e.g. Material Design's standard easings).
function bezierComponent(s: number, p1: number, p2: number): number {
  const inv = 1 - s;
  return 3 * inv * inv * s * p1 + 3 * inv * s * s * p2 + s * s * s;
}

function bezierComponentDerivative(s: number, p1: number, p2: number): number {
  const inv = 1 - s;
  return 3 * inv * inv * p1 + 6 * inv * s * (p2 - p1) + 3 * s * s * (1 - p2);
}

export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (x: number) => number {
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 8; i++) {
      const derivative = bezierComponentDerivative(s, x1, x2);
      if (Math.abs(derivative) < 1e-6) break;
      s = clamp(s - (bezierComponent(s, x1, x2) - x) / derivative, 0, 1);
    }
    return bezierComponent(s, y1, y2);
  };
}
