// SPDX-License-Identifier: GPL-3.0-or-later

import { assertEquals, assert } from "@std/assert";
import { arrowHead, bezierPath } from "./geometry.ts";

Deno.test("bezierPath format and endpoints", () => {
  const a = { x: 10, y: 20 }, b = { x: 110, y: 220 };
  const d = bezierPath(a, b);
  assert(d.startsWith(`M ${a.x},${a.y} C `));
  assert(d.endsWith(` ${b.x},${b.y}`));
});

Deno.test("arrowHead returns triangle with tip at b", () => {
  const a = { x: 0, y: 0 }, b = { x: 100, y: 0 };
  const [tip, left, right] = arrowHead(a, b, 10);
  assertEquals(tip, b);
  // base should be behind tip (x smaller for this direction)
  assert(left.x < tip.x);
  assert(right.x < tip.x);
  // symmetric y around the line (here y should be +/- some value)
  assert(Math.abs(left.y - (-right.y)) < 1e-6);
});
