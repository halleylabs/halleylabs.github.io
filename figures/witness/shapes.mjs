// witness: layout and the parts that change shape as the deck runs.
// Shared by build.mjs (static art) and the live module (inlined, imports stripped).
import { cylinder, extrude, lineOnTop, ring, iso, pathOf } from "../../vendor/anatomy/kit/iso-kit.mjs";

export const DECK_TOP = 19.2;
export const SUPPLY = [-29, -14];
export const TAKEUP = [29, -14];
export const REEL = { table: 8, flange: 23, flangeZ: 20.2, packZ: 21.2, packTop: 26.6, cap: 5, capTop: 28.6, hub: 7.5, holes: 21.6 };
export const TAPE_Z = 21.6;
export const TAPE_H = 4.6;
export const TAPE_T = 0.5;
export const GUIDE_L = [-17, 18.6];
export const GUIDE_R = [16, 18.6];
export const ROLLER = 1.6;
export const FRONT_Y = GUIDE_L[1] + ROLLER; // tape's inner face on the front run
export const METER = { c: [111, 0], top: 16, r: 8.4, from: -50, span: 100 };

const rad = (deg) => (deg * Math.PI) / 180;

// External tangent between two circles; side picks the one whose normal points along +side on x.
function tangent(c1, r1, c2, r2, side) {
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const D = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const a = Math.acos((r1 - r2) / D);
  const options = [base + a, base - a].map((angle) => [Math.cos(angle), Math.sin(angle)]);
  const n = options.find((v) => Math.sign(v[0]) === side) ?? options[0];
  return { n, a1: Math.atan2(n[1], n[0]), p1: [c1[0] + r1 * n[0], c1[1] + r1 * n[1]], p2: [c2[0] + r2 * n[0], c2[1] + r2 * n[1]] };
}

function arc(c, r, a0, a1, steps = 10) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  });
}

// A ribbon of tape standing on its edge: a centreline offset by half the tape's thickness either side.
function ribbon(line) {
  const n = line.length;
  const normals = line.map((p, i) => {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
  const h = TAPE_T / 2;
  const plus = line.map((p, i) => [p[0] + normals[i][0] * h, p[1] + normals[i][1] * h]);
  const minus = line.map((p, i) => [p[0] - normals[i][0] * h, p[1] - normals[i][1] * h]);
  return [...plus, ...minus.reverse()];
}

// The tape from the supply pack, round the front of guide L, across the heads, round guide R, onto the take-up pack.
// Every part of it faces the viewer, so it is one ribbon.
export function tapeRing(rs, rt) {
  const g = ROLLER + TAPE_T / 2;
  const left = tangent(SUPPLY, rs + TAPE_T / 2, GUIDE_L, g, -1);
  const right = tangent(TAKEUP, rt + TAPE_T / 2, GUIDE_R, g, 1);
  return ribbon([left.p1, ...arc(GUIDE_L, g, left.a1, Math.PI / 2, 8), ...arc(GUIDE_R, g, Math.PI / 2, right.a1, 8), right.p1]);
}

export const tapePaths = (rs, rt, P) => extrude(tapeRing(rs, rt), TAPE_Z, TAPE_H, P, { convex: false });

export const packPaths = (c, r, P) => cylinder(c[0], c[1], r, REEL.packZ, REEL.packTop - REEL.packZ, P, 60);

// Marks that turn with a reel: three hub spokes, a splice line on the pack, six holes in the flange.
export function reelMarks(c, packR, angle, P) {
  const at = (a, r) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  const spokes = [0, 1, 2].map((i) => lineOnTop(at(angle + (i * 2 * Math.PI) / 3, 1.3), at(angle + (i * 2 * Math.PI) / 3, REEL.cap), REEL.capTop, P)).join("");
  const splice = lineOnTop(at(angle + 0.9, REEL.hub), at(angle + 0.9, packR), REEL.packTop, P);
  const holes = Array.from({ length: 6 }, (_, i) => iso([...at(angle + (i * Math.PI) / 3 + 0.5, REEL.holes), REEL.flangeZ + 1], P));
  return { spokes, splice, holes };
}

export const holesSvg = (points) => points.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="0.55"/>`).join("");

export function needlePath(v, P) {
  const a = rad(METER.from + METER.span * v);
  const [cx, cy] = METER.c;
  const s = Math.sin(a);
  const c = Math.cos(a);
  return lineOnTop([cx - s * 2.6, cy + c * 2.6], [cx + s * METER.r, cy - c * METER.r], METER.top + 0.2, P);
}

export const hubRing = (c, P) => ring(c[0], c[1], REEL.hub, REEL.packTop, P, 48);
export const flat = (points) => pathOf(points);
