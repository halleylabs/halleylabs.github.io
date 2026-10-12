// AgentReplay: layout and the parts that change as the roll is read.
// Shared by build.mjs (static art) and the live module (inlined, imports stripped).
import { extrude, iso, pathOf } from "../../vendor/anatomy/kit/iso-kit.mjs";
import { LANE_Y, PITCH, FIRST, HOLE, ROWS, xOfRow } from "./model.mjs";

export const AXLE_Z = 17.8;
export const PACK_R = 9.8;
export const FLANGE_R = 13;
export const SPOOL_X = { supply: -64, takeup: 64 };
export const PAPER = { y0: -32, y1: 24, z: 27.6, top: 28 };
export const FRONT_FLANGE = 25.4; // the outer face of each spool's front flange
export const CLIP_X = [-64, 64];
export const BEAM_TOP = 45;

// The gate lever: it swings about a vertical pin; its tail is held by the gate finger's head
// and its nose holds the stop flag's collar up.
export const LEVER = { pivot: [7.42, 26.25], tail: [3.82, 14.8], nose: [11.02, 37.7], r: 1.6, z: 50.4, h: 1.4, swing: -35 };

const rot = ([x, y], [cx, cy], a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
};

export function leverRing(gate) {
  const a = (LEVER.swing * Math.PI * gate) / 180;
  const t = rot(LEVER.tail, LEVER.pivot, a);
  const n = rot(LEVER.nose, LEVER.pivot, a);
  const dir = Math.atan2(n[1] - t[1], n[0] - t[0]);
  const cap = (c, from) => Array.from({ length: 13 }, (_, i) => {
    const ang = from + (i / 12) * Math.PI;
    return [c[0] + LEVER.r * Math.cos(ang), c[1] + LEVER.r * Math.sin(ang)];
  });
  return [...cap(n, dir - Math.PI / 2), ...cap(t, dir + Math.PI / 2)];
}
export const leverPaths = (gate, P) => extrude(leverRing(gate), LEVER.z, LEVER.h, P, { bevel: 0.3 });

// Holes punched in the roll, and the small timing marks along its back edge, with the roll at s.
export function holesPath(s, P) {
  const parts = [];
  const z = PAPER.top;
  const rect = (x, y, hx, hy) => pathOf([[x - hx, y - hy], [x + hx, y - hy], [x + hx, y + hy], [x - hx, y + hy]].map(([a, b]) => iso([a, b, z], P)), true);
  for (const { row, lanes } of ROWS) {
    const x = xOfRow(row, s);
    if (x < CLIP_X[0] - 3 || x > CLIP_X[1] + 3) continue;
    for (const lane of lanes) parts.push(rect(x, LANE_Y[lane], HOLE.half, HOLE.wide));
  }
  const first = Math.ceil((s - CLIP_X[1] - 3 + FIRST) / PITCH);
  for (let row = first; row <= first + 20; row++) {
    const x = FIRST - row * PITCH + s + PITCH / 2;
    if (x < CLIP_X[0] - 2 || x > CLIP_X[1] + 2) continue;
    parts.push(rect(x, PAPER.y0 + 2.6, 0.6, 0.6));
  }
  return parts.join("");
}

// Three spokes and three windows on a spool's front flange, turned by the roll.
export function spoolMarks(key, s, P) {
  const cx = SPOOL_X[key];
  const a0 = -s / PACK_R + (key === "takeup" ? 0.7 : 0);
  const at = (r, a) => iso([cx + r * Math.cos(a), FRONT_FLANGE, AXLE_Z + r * Math.sin(a)], P);
  const spokes = [0, 1, 2].map((i) => pathOf([at(2.6, a0 + (i * 2 * Math.PI) / 3), at(FLANGE_R - 1.4, a0 + (i * 2 * Math.PI) / 3)])).join("");
  const windows = [0, 1, 2].map((i) => {
    const a = a0 + Math.PI / 3 + (i * 2 * Math.PI) / 3;
    const c = [cx + 7.4 * Math.cos(a), AXLE_Z + 7.4 * Math.sin(a)];
    return pathOf(Array.from({ length: 16 }, (_, k) => iso([c[0] + 2 * Math.cos((k / 16) * 2 * Math.PI), FRONT_FLANGE, c[1] + 2 * Math.sin((k / 16) * 2 * Math.PI)], P)), true);
  }).join("");
  return { spokes, windows };
}
