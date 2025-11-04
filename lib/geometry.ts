// SPDX-License-Identifier: GPL-3.0-or-later

// Geometry helpers used conceptually by the frontend canvas
// Keep pure and side-effect free for easy testing.

export interface Point { x: number; y: number }

// Compute a cubic bezier SVG path from a to b with horizontal tangents and a distance-based handle.
export function bezierPath(a: Point, b: Point): string {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
  const c1x = a.x + dx, c1y = a.y;
  const c2x = b.x - dx, c2y = b.y;
  return `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`;
}

// Compute arrowhead points for an arrow ending at b, pointing from a->b.
// Returns a triangle [tip, left, right]. size is the arrow length in px.
export function arrowHead(a: Point, b: Point, size = 10, spread = Math.PI / 6): [Point, Point, Point] {
  const vx = b.x - a.x; const vy = b.y - a.y;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len; const uy = vy / len; // unit direction
  // base point of arrowhead
  const bx = b.x - ux * size;
  const by = b.y - uy * size;
  // perpendicular
  const px = -uy; const py = ux;
  const half = size * Math.tan(spread / 2);
  const left: Point = { x: bx + px * half, y: by + py * half };
  const right: Point = { x: bx - px * half, y: by - py * half };
  return [ { x: b.x, y: b.y }, left, right ];
}
