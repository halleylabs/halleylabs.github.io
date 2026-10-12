// fasthands: a key-press robot whose feeler pin checks the key before the finger fires.
// node build.mjs  writes the bare svg, the live module and both preview pages.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "src", "figures");
const SLUG = "fasthands";
const W = 480;
const H = 320;

// ---------- world ----------
const BASE = { x: -112, y: -70, w: 222, d: 140, r: 8 };
const BASE_H = 12;
const FOOT_H = 5;
const RAILS = [-33, 27];
const RAIL_FROM = -62;
const RAIL_TO = 78;
const RAIL_H = 4;
const BLOCK_Z = RAIL_H;
const BLOCK_TOP = 9;
const BLOCK_XS = [-34, 34];
const CARRIAGE = { x: -48, y: -42, w: 96, d: 84, r: 3 };
const CAR_Z = BLOCK_TOP;
const CAR_TOP = 13;
const KEYPAD = { x: -38, y: -35, w: 76, d: 70, r: 3 };
const PAD_TOP = 17;
const KEY = 14;
const KEY_H = 4;
const KEY_TOP = PAD_TOP + KEY_H;
const COLS = [-27, -9, 9, 27];
const ROWS = [-24, -6, 12];
const TARGET = [9, 12];
const PIN = [9, 27.5];
const MARGIN_Y = 21;

const PIN_REST = 23; // pin tip at rest
const PIN_LEN = 84;
const NOSE = 1.2;
const COLLAR_AT = 55;
const FLAG_AT = 84;

const HEAD = { x: -3, y: 2, w: 24, d: 20, r: 2 };
const HEAD_Z = 60;
const HEAD_TOP = 92;
const LUG = { x: 3, y: 22, w: 18, d: 9, r: 1.5 };
const LUG_LOW = [60, 64];
const LUG_HIGH = [88, 92];
const ARM = { x: 1, y: -64, w: 16, d: 86, r: 2 };
const ARM_TOP = 100;
const COLUMN = { x: -4, y: -66, w: 26, d: 14, r: 2 };
const COLUMN_FOOT = { x: -12, y: -69, w: 42, d: 22, r: 3 };
const CLAMP = { x: -6, y: -68, w: 30, d: 18, r: 2.5 };
const CLAMP_Z = 80;

const PAD_REST = 37; // finger pad bottom at rest
const PAD_FIRED = KEY_TOP - M.KEY_TRAVEL;
const STROKE = PAD_REST - PAD_FIRED;

const SPRING = { at: PIN, r: 2.25, turns: 6, up: LUG_HIGH[0], low: PIN_REST + COLLAR_AT + 1.6 };

const BOX = { x: 78, y: -62, w: 26, d: 30, r: 2 };
const BOX_H = 16;
const LABEL = { x: 80, y: 30, w: 32, d: 12, r: 1.5 };
const STRIP = { x: -58, y: 50, w: 136, d: 7, r: 1 };

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [9, 12, 120], [PIN[0], PIN[1], PIN_REST + PIN_LEN], [9, -64, ARM_TOP]],
  W,
  H,
  { pad: 22, azimuth: 45, elevation: 30 },
);

// ---------- helpers ----------
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 4, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const cyl = (x, y, r, z, h, steps = 24, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const seg = (a, b) => k.segment(a, b, P);
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const byDepth = (list, key = (item) => item) => [...list].sort((a, b) => depth(...key(a)) - depth(...key(b)));
const loop = (points) => k.pathOf(points.map(at), true);
const slotOnX = (x, yc, z0, z1, half) => {
  const points = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; points.push([x, yc + Math.cos(a) * half, z1 - half + Math.sin(a) * -half]); }
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI; points.push([x, yc + Math.cos(a) * half, z0 + half - Math.sin(a) * half]); }
  return loop(points);
};

function hull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = [];
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
const circle = (cx, cy, r, z, n = 48) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2), z]);
// Screen region covering a vertical cylinder of radius r from height z upward.
const upward = (x, y, r, z) => k.pathOf(hull(circle(x, y, r, z).flatMap((p) => { const s = at(p); return [s, [s[0], s[1] - 600]]; })), true);
// Screen region below the pin axis at height z.
const below = (x, y, z) => { const [sx, sy] = at([x, y, z]); return `M${sx - 300} ${sy}H${sx + 300}V${sy + 600}H${sx - 300}Z`; };
const ellipse = (x, y, r, z) => k.pathOf(circle(x, y, r, z).map(at), true);

// ---------- base ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 22), ([x, y]) => [x, y, 0])) {
    out.push(S(cyl(x, y, 7, -BASE_H - FOOT_H, 1.6, 28), { tone: "lo" }));
    out.push(S(cyl(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), { tone: "mid" }));
  }
  out.push(S(slab(BASE, -BASE_H, BASE_H, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BASE, -BASE_H + 4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler under the carriage pointer: one major tick per key pitch
  out.push(S(slab(STRIP, 0, 0.6, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(-54, 72, 3, 6, STRIP.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([0, STRIP.y + 0.8], [0, STRIP.y + 5], 0.6, P), { tone: "hi" }));
  out.push(D([at([STRIP.x + 2, STRIP.y + 3.5, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3.5, 0.6])], { size: 0.45 }));
  // label plate
  out.push(S(slab(LABEL, 0, 0.8, 4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([LABEL.x + 6, LABEL.y + 3.6 + row * 2.4], [LABEL.x + (row === 1 ? 20 : 26), LABEL.y + 3.6 + row * 2.4], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([LABEL.x + 3, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------- controller box (drives the finger solenoid) ----------
function box() {
  const out = [];
  const top = BOX_H;
  out.push(S(slab(BOX, 0, top, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(BOX, 4, P, 4), { tone: "faint" }) }));
  const lid = k.insetPlan(BOX, 1);
  out.push(S(slab(lid, top, 2, 4, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(lid, 2.4), top + 2, P), { tone: "faint" }));
  out.push(D(k.corners(lid, 3.6).map(([x, y]) => at([x, y, top + 2])), { size: 0.45 }));
  // vents on the +x face
  const fx = BOX.x + BOX.w;
  out.push(L([-56, -52, -48, -44, -40, -36].map((y) => slotOnX(fx, y, 7, 13, 0.8)).join(""), { tone: "lo" }));
  // toggle on the lid
  const sw = [BOX.x + 9, BOX.y + 22];
  out.push(S(cyl(sw[0], sw[1], 3, top + 2, 0.8, 20), { tone: "mid" }));
  out.push(S(cyl(sw[0], sw[1], 1.8, top + 2.8, 2, 16), { tone: "mid" }));
  out.push(k.wireSvg(at([sw[0], sw[1], top + 4.8]), at([sw[0] + 1.6, sw[1] + 3.2, top + 10]), { tone: "hi", size: 1.1 }));
  // connector shell on the lid
  const plug = { x: BOX.x + 15, y: BOX.y + 6, w: 7, d: 10, r: 1.2 };
  out.push(S(slab(plug, top + 2, 3, 3, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plug, 1.6), top + 5, P, 3), { tone: "lo" }));
  return out.join("");
}

// ---------- emergency stop ----------
function estop() {
  const out = [];
  const plan = { x: -100, y: 18, w: 22, d: 22, r: 2.5 };
  const [cx, cy] = [plan.x + 11, plan.y + 11];
  out.push(S(slab(plan, 0, 12, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, 3, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(plan, 3).map(([x, y]) => at([x, y, 12])), { size: 0.45 }));
  out.push(S(cyl(cx, cy, 6.4, 12, 1.4, 32, 0.3), { tone: "mid" }));
  out.push(S(cyl(cx, cy, 3.4, 13.4, 3, 24), { tone: "mid" }));
  out.push(S(cyl(cx, cy, 7.4, 16.4, 4, 40, 0.6), { tone: "mid", inner: L(k.sideArc(cx, cy, 7.4, 18.2, P, 36), { tone: "faint" }) }));
  out.push(L(k.ring(cx, cy, 5, 20.4, P, 36), { tone: "faint" }));
  return out.join("");
}

// ---------- column, clamp ----------
function column() {
  const out = [];
  out.push(S(slab(COLUMN_FOOT, 0, 3, 4, 0.5), { tone: "mid" }));
  const footScrews = k.corners(COLUMN_FOOT, 4);
  out.push(L(footScrews.map(([x, y]) => k.ring(x, y, 1.8, 3, P, 14)).join(""), { tone: "lo" }));
  out.push(D(footScrews.map(([x, y]) => at([x, y, 3])), { size: 0.45 }));
  out.push(S(slab(COLUMN, 3, CLAMP_Z - 3, 4, 0.6), { tone: "mid" }));
  // dovetail way on the front face, foot to clamp
  const way = { x: COLUMN.x + 7, y: COLUMN.y + COLUMN.d, w: 12, d: 1.6, r: 0.4 };
  out.push(S(slab(way, 3, CLAMP_Z - 3, 2), { tone: "mid" }));
  out.push(D([12, 30, 48, 66].map((z) => at([way.x + way.w / 2, way.y + way.d, z])), { size: 0.4 }));
  out.push(S(slab(CLAMP, CLAMP_Z, HEAD_TOP - CLAMP_Z, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(CLAMP, CLAMP_Z + 6, P, 4), { tone: "faint" }) }));
  // lock screw on the clamp's front face
  const lx = CLAMP.x + CLAMP.w - 7;
  const ly = CLAMP.y + CLAMP.d;
  out.push(S(slab({ x: lx - 1.4, y: ly, w: 2.8, d: 3, r: 0.8 }, CLAMP_Z + 3, 4, 2), { tone: "mid", crease: "none" }));
  out.push(S(cyl(lx, ly + 4.4, 2.8, CLAMP_Z + 2, 6, 20), { tone: "mid" }));
  out.push(L(k.knurl(lx, ly + 4.4, 2.8, CLAMP_Z + 2, CLAMP_Z + 8, 18, P), { tone: "lo" }));
  return out.join("");
}

// ---------- rails and stops ----------
function rails() {
  const out = [];
  for (const y of RAILS) {
    const plan = { x: RAIL_FROM, y: y - 3, w: RAIL_TO - RAIL_FROM, d: 6, r: 1 };
    out.push(S(slab(plan, 0, RAIL_H, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_FROM + 4, RAIL_TO - 4].map((x) => at([x, y, RAIL_H])), { size: 0.4 }));
  }
  return out.join("");
}
const stopAt = (x, y) => {
  const plan = { x, y: y - 5, w: 6, d: 10, r: 1.2 };
  return S(slab(plan, 0, BLOCK_TOP, 3, 0.5), { tone: "mid" }) + D([at([x + 3, y - 2.6, BLOCK_TOP]), at([x + 3, y + 2.6, BLOCK_TOP])], { size: 0.45 });
};
const leftStops = () => RAILS.map((y) => stopAt(-48, y)).join("");
const rightStops = () => RAILS.map((y) => stopAt(BLOCK_XS[1] + 7 + M.PITCH + 1, y)).join("");

// ---------- carriage ----------
function carriageUnder() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CARRIAGE, 4), 0.2, 0.1, P)}" style="filter:blur(3px)"/>`];
  const blocks = RAILS.flatMap((y) => BLOCK_XS.map((x) => [x, y]));
  for (const [x, y] of byDepth(blocks, ([x, y]) => [x, y, 0])) {
    const plan = { x: x - 7, y: y - 5, w: 14, d: 10, r: 1.5 };
    out.push(S(slab(plan, BLOCK_Z, BLOCK_TOP - BLOCK_Z, 3, 0.4), { tone: "mid" }));
  }
  return out.join("");
}

function sideStops(side) {
  const out = [];
  for (const y of byDepth([-20, 20], (y) => [0, y, 0])) {
    const x = side < 0 ? KEYPAD.x - 7 : KEYPAD.x + KEYPAD.w;
    const stop = { x, y: y - 4, w: 7, d: 8, r: 1.2 };
    out.push(S(slab(stop, CAR_TOP, PAD_TOP - CAR_TOP, 3, 0.4), { tone: "mid" }));
    out.push(L(k.ring(x + 3.5, y, 1.5, PAD_TOP, P, 14), { tone: "lo" }));
    out.push(D([at([x + 3.5, y, PAD_TOP])], { size: 0.4 }));
  }
  return out.join("");
}

function keyAt(x, y) {
  const plan = { x: x - KEY / 2, y: y - KEY / 2, w: KEY, d: KEY, r: 2 };
  return S(slab(plan, PAD_TOP, KEY_H, 3, 0.5), { tone: "hi", crease: "lo" }) + L(k.planOutline(k.insetPlan(plan, 2.6), KEY_TOP, P, 3), { tone: "faint" });
}

function carriage() {
  const out = [];
  out.push(S(slab(CARRIAGE, CAR_Z, CAR_TOP - CAR_Z, 6, 0.8), { tone: "mid" }));
  const corners = k.corners(CARRIAGE, 3.4);
  out.push(D(corners.map(([x, y]) => at([x, y, CAR_TOP])), { size: 0.45 }));
  out.push(D([-38, -24, 24, 38].map((x) => at([x, CARRIAGE.y + CARRIAGE.d - 2.4, CAR_TOP])), { size: 0.4, tone: "lo" }));
  // pointer over the ruler
  out.push(S(slab({ x: -2, y: CARRIAGE.y + CARRIAGE.d, w: 4, d: 1.6, r: 0.4 }, 3, CAR_TOP - 3, 2), { tone: "mid", crease: "none" }));
  const tipY = CARRIAGE.y + CARRIAGE.d + 10.4;
  out.push(S(slab({ x: -1.3, y: CARRIAGE.y + CARRIAGE.d + 1.6, w: 2.6, d: 8.8, r: 0.6 }, 3, 1, 2), { tone: "mid" }));
  out.push(L(k.lineOnTop([0, CARRIAGE.y + CARRIAGE.d + 1.6], [0, tipY], 4, P), { tone: "hi" }));
  // handle
  const hx = 30;
  const hy = CARRIAGE.y + CARRIAGE.d;
  out.push(S(slab({ x: hx - 2, y: hy, w: 4, d: 3.2, r: 1 }, CAR_Z + 1, 2.4, 2), { tone: "mid", crease: "none" }));
  out.push(S(cyl(hx, hy + 5.6, 3.2, CAR_Z - 0.4, 5.2, 20), { tone: "mid" }));
  out.push(L(k.knurl(hx, hy + 5.6, 3.2, CAR_Z - 0.4, CAR_Z + 4.8, 20, P), { tone: "lo" }));
  // keypad between side stops
  out.push(sideStops(-1));
  out.push(S(slab(KEYPAD, CAR_TOP, PAD_TOP - CAR_TOP, 6, 0.6), { tone: "hi", crease: "lo" }));
  out.push(sideStops(1));
  out.push(L(k.lineOnTop([KEYPAD.x, MARGIN_Y], [KEYPAD.x + KEYPAD.w, MARGIN_Y], PAD_TOP, P), { tone: "faint" }));
  const padScrews = [[KEYPAD.x + 3.4, KEYPAD.y + 3.4], [KEYPAD.x + KEYPAD.w - 3.4, KEYPAD.y + 3.4], [KEYPAD.x + 3.4, KEYPAD.y + KEYPAD.d - 3.4], [KEYPAD.x + KEYPAD.w - 3.4, KEYPAD.y + KEYPAD.d - 3.4]];
  out.push(L(padScrews.map(([x, y]) => k.ring(x, y, 1.6, PAD_TOP, P, 14)).join(""), { tone: "lo" }));
  out.push(D(padScrews.map(([x, y]) => at([x, y, PAD_TOP])), { size: 0.45 }));
  // registration bushing beside the target key
  out.push(`<path class="iso-shade" data-shade="2" d="${ellipse(PIN[0], PIN[1], 3.4, PAD_TOP)}"/>`);
  out.push(L(k.ring(PIN[0], PIN[1], 3.4, PAD_TOP, P, 40), { tone: "lo" }));
  out.push(`<path class="iso-shade" data-shade="0" d="${ellipse(PIN[0], PIN[1], M.HOLE_R, PAD_TOP)}"/>`);
  out.push(L(k.ring(PIN[0], PIN[1], M.HOLE_R, PAD_TOP, P, 32), { tone: "mid" }));
  // keys, far to near; the target key moves on its own
  const keys = COLS.flatMap((x) => ROWS.map((y) => [x, y]));
  for (const [x, y] of byDepth(keys, ([x, y]) => [x, y, 0])) {
    const isTarget = x === TARGET[0] && y === TARGET[1];
    out.push(isTarget ? `<g data-part="key">${keyAt(x, y)}</g>` : keyAt(x, y));
  }
  return out.join("");
}

// ---------- finger ----------
function finger() {
  const [x, y] = TARGET;
  const z = PAD_REST;
  const out = [];
  out.push(S(cyl(x, y, 5, z, 3, 32, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(x, y, 4, z + 3, P, 32), { tone: "faint" }));
  out.push(S(cyl(x, y, 3, z + 3, 1.6, 24), { tone: "mid" }));
  out.push(S(cyl(x, y, 2.2, z + 4.6, 48, 20), { tone: "mid", crease: "none", inner: L([z + 12, z + 15].map((h) => k.sideArc(x, y, 2.2, h, P, 12)).join(""), { tone: "faint" }) }));
  return out.join("");
}

// ---------- pin (the lit part), in three clipped runs ----------
const pinRod = () => {
  const [x, y] = PIN;
  return S(cyl(x, y, M.PIN_R, PIN_REST + NOSE, PIN_LEN - NOSE, 20), { tone: "hi", lit: true, crease: "none" });
};
const pinNose = () => S(cyl(PIN[0], PIN[1], M.PIN_R - 0.45, PIN_REST, NOSE + 0.2, 16), { tone: "hi", lit: true, crease: "none" });
const pinCollar = () => S(cyl(PIN[0], PIN[1], 2.6, PIN_REST + COLLAR_AT, 1.6, 20), { tone: "hi", crease: "lo" });
const pinFlag = () => {
  const z = PIN_REST + FLAG_AT;
  return S(slab({ x: PIN[0] + 1, y: PIN[1] - 0.6, w: 8, d: 1.2, r: 0.3 }, z, 2, 2), { tone: "hi", crease: "lo" }) + S(cyl(PIN[0], PIN[1], 2.2, z - 0.4, 2.8, 20, 0.3), { tone: "hi", crease: "lo" });
};

function lug([z0, z1]) {
  const out = [S(slab(LUG, z0, z1 - z0, 3, 0.4), { tone: "mid" })];
  out.push(L(k.ring(PIN[0], PIN[1], 2, z1, P, 20), { tone: "lo" }));
  out.push(D([at([LUG.x + 2, LUG.y + 2.2, z1]), at([LUG.x + LUG.w - 2, LUG.y + 2.2, z1])], { size: 0.4 }));
  return out.join("");
}

function head() {
  const out = [];
  out.push(S(cyl(TARGET[0], TARGET[1], 4.5, HEAD_Z - 4, 4, 28, 0.4), { tone: "mid" }));
  out.push(S(slab(HEAD, HEAD_Z, HEAD_TOP - HEAD_Z, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(HEAD, 76, P, 4), { tone: "faint" }) }));
  const fx = HEAD.x + HEAD.w;
  out.push(D([[fx, 6, 68], [fx, 18, 68], [fx, 6, 84], [fx, 18, 84]].map(at), { size: 0.45 }));
  out.push(D([[0, HEAD.y + HEAD.d, 70], [0, HEAD.y + HEAD.d, 82]].map(at), { size: 0.45 }));
  return out.join("");
}

function arm() {
  const out = [];
  out.push(S(slab(ARM, HEAD_TOP, ARM_TOP - HEAD_TOP, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ ...ARM, y: ARM.y + 16, d: ARM.d - 34 }, 2.4), ARM_TOP, P, 3), { tone: "faint" }));
  out.push(D([[ARM.x + 4, ARM.y + 5], [ARM.x + ARM.w - 4, ARM.y + 5], [ARM.x + 4, ARM.y + 11], [ARM.x + ARM.w - 4, ARM.y + 11]].map(([x, y]) => at([x, y, ARM_TOP])), { size: 0.45 }));
  return out.join("");
}

function can() {
  const [x, y] = TARGET;
  const out = [];
  out.push(S(cyl(x, y, 7, ARM_TOP, 16, 44, 0.6), { tone: "mid", inner: L([104, 112].map((z) => k.sideArc(x, y, 7, z, P, 40)).join(""), { tone: "faint" }) }));
  out.push(S(cyl(x, y, 7.6, ARM_TOP + 16, 2, 44, 0.5), { tone: "mid" }));
  out.push(S(cyl(x, y, 2.6, ARM_TOP + 18, 2, 20), { tone: "mid" }));
  out.push(D(Array.from({ length: 4 }, (_, i) => { const a = Math.PI / 4 + (i * Math.PI) / 2; return at([x + 5.4 * Math.cos(a), y + 5.4 * Math.sin(a), ARM_TOP + 18]); }), { size: 0.45 }));
  // terminal block on the can's side
  const term = { x: x + 6.4, y: y - 3, w: 3, d: 6, r: 0.8 };
  out.push(S(slab(term, ARM_TOP + 5, 6, 2, 0.3), { tone: "mid" }));
  out.push(D([at([term.x + 3, y - 1.4, ARM_TOP + 8]), at([term.x + 3, y + 1.4, ARM_TOP + 8])], { size: 0.45, tone: "hi" }));
  return out.join("");
}

function sensorBase() {
  const base = { x: 12, y: 23, w: 8, d: 8, r: 1 };
  const out = [S(slab(base, LUG_HIGH[1], 2, 2, 0.3), { tone: "mid" })];
  out.push(S(slab({ x: 13, y: 24.4, w: 6, d: 1.6, r: 0.4 }, LUG_HIGH[1] + 2, 6, 2), { tone: "mid" }));
  return out.join("");
}
const sensorFront = () => S(slab({ x: 13, y: 29.6, w: 6, d: 1.6, r: 0.4 }, LUG_HIGH[1] + 2, 6, 2), { tone: "mid" }) + D([at([16, 31.2, LUG_HIGH[1] + 5])], { size: 0.45 });

// ---------- spring between the pin collar and the upper lug ----------
function springPaths(top) {
  const { at: c, r, turns, up } = SPRING;
  const front = [];
  const back = [];
  const steps = Math.round(turns * 24);
  const view = k.towardViewer(P);
  let run = null;
  let side = null;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * turns * Math.PI * 2;
    const cs = Math.cos(a), sn = Math.sin(a);
    const z = top + (up - top) * (i / steps);
    const point = at([c[0] + r * cs, c[1] + r * sn, z]);
    const facing = cs * view[0] + sn * view[1] >= 0 ? "front" : "back";
    if (facing !== side) {
      if (run) run.push(point);
      run = run ? [run[run.length - 1]] : [];
      (facing === "front" ? front : back).push(run);
      side = facing;
    }
    run.push(point);
  }
  const join = (runs) => runs.filter((list) => list.length > 1).map((list) => k.pathOf(list)).join("");
  return { front: join(front), back: join(back) };
}

// ---------- assemble ----------
const COIL = springPaths(SPRING.low);
const slide = (inner, name) => `<g data-part="${name}">${inner}</g>`;
const ID = (name) => `${SLUG}-${name}`;
const defs = `<defs>
<clipPath id="${ID("pin-low")}"><path d="${upward(PIN[0], PIN[1], M.PIN_R + 0.05, PAD_TOP)}"/><path data-part="hole-clip" d="${ellipse(PIN[0], PIN[1], M.HOLE_R, PAD_TOP)}"/></clipPath>
<clipPath id="${ID("pin-under")}"><path d="${below(PIN[0], PIN[1], LUG_LOW[0] + 2)}"/></clipPath>
<clipPath id="${ID("pin-mid")}"><path d="${upward(PIN[0], PIN[1], M.PIN_R + 0.05, LUG_LOW[1])}"/></clipPath>
<clipPath id="${ID("pin-high")}"><path d="${upward(PIN[0], PIN[1], M.PIN_R + 0.05, LUG_HIGH[1])}"/></clipPath>
</defs>`;

const body = [
  defs,
  base(),
  box(),
  estop(),
  column(),
  rails(),
  leftStops(),
  slide(carriageUnder(), "carriage"),
  rightStops(),
  slide(carriage(), "carriage"),
  slide(finger(), "finger"),
  `<g clip-path="url(#${ID("pin-under")})"><g clip-path="url(#${ID("pin-low")})"><g data-part="pin">${pinNose()}${pinRod()}</g></g></g>`,
  head(),
  lug(LUG_LOW),
  `<path data-part="spring-back" class="iso-line" data-tone="lo" d="${COIL.back}"/>`,
  `<g clip-path="url(#${ID("pin-mid")})"><g data-part="pin">${pinRod()}</g></g>`,
  `<g data-part="pin">${pinCollar()}</g>`,
  `<path data-part="spring-front" class="iso-line" data-tone="mid" d="${COIL.front}"/>`,
  arm(),
  can(),
  lug(LUG_HIGH),
  sensorBase(),
  `<g clip-path="url(#${ID("pin-high")})"><g data-part="pin">${pinRod()}</g></g>`,
  `<g data-part="pin">${pinFlag()}</g>`,
  sensorFront(),
];

const LABEL_TEXT =
  "A key-press robot over a keypad on a sliding plate. Before the finger fires, a feeler pin drops into the registration hole beside the target key. If the plate has moved, the pin lands on solid plate, its flag never reaches the sensor and the finger stays up.";

const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body });
writeFileSync(join(OUT, `${SLUG}.svg`), svg);

// ---------- live module ----------
const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const DATA = { P, stroke: STROKE, padRest: PAD_REST, keyTop: KEY_TOP, spring: SPRING };
const live = readFileSync(join(HERE, "live.src.js"), "utf8").replace("/*DATA*/", JSON.stringify(DATA)).replace("/*MODEL*/", model);
writeFileSync(join(OUT, `${SLUG}.live.js`), live);

// ---------- preview pages ----------
const inline = live.replace(/^import .*$/m, "").replace("export function mount", "function mount") + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
const plate = k.plateHtml({
  fig: "Fig 1",
  title: "Feeler pin guard",
  hint: "Move across to shift the plate",
  readout: M.readoutOf({ shift: 0, drop: 0, press: 0 }),
  keys: [
    { mark: "lit", label: "Feeler pin: checks the key is still under the finger" },
    { mark: "raised", label: "Keypad on a sliding plate, one key pitch per shift" },
  ],
  caption: `Before every press the feeler pin drops into the hole beside the target key. If the plate has shifted, the pin lands on solid plate, the sensor never trips and the finger stays up. In the drift test that guard made ${M.WRONG_GUARDED} of ${M.TRIALS} wrong clicks, against ${M.WRONG_UNGUARDED} of ${M.TRIALS} without it, while sending ${M.FEWER_TOKENS}% fewer observation tokens.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Feeler pin guard: arrow keys shift the plate" aria-valuemin="0" aria-valuemax="${M.PITCH}" aria-valuenow="0">${svg}</div>`,
});
for (const theme of ["light", "dark"]) {
  const file = theme === "light" ? "preview-light.html" : "preview.html";
  writeFileSync(join(HERE, file), k.pageHtml({ title: "fasthands", theme, body: plate, script: kitScript() + inline }));
}
console.log("wrote", `${SLUG}.svg`, `${SLUG}.live.js`, "preview-light.html", "preview.html", "scale", P.scale.toFixed(3));
