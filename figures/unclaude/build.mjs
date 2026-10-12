// UnClaude: a SCARA arm that swaps to the tool head that fits each job.
// node build.mjs  writes the bare svg, the live module and both preview pages.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { reach, joints, stadium, itemsOf, orderOf } from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "src", "figures");
const SLUG = "unclaude";
const W = 480;
const H = 320;

// ---------- world ----------
const BASE = { x: -112, y: -68, w: 226, d: 136, r: 8 };
const BASE_H = 12;
const FOOT_H = 5;
const S = [-30, -38];
const L1 = 64;
const L2 = 56;
const L1Z = [48, 57];
const L2Z = [57, 65];
const COLUMN_R = 16;
const FLANGE = { x: S[0] - 21, y: S[1] - 21, w: 42, d: 42, r: 3 };
const CAP = { r: 8, h: 3 };
const ELBOW = { r: 10.5, top: 77 };
const QUILL = { r: 9.5, top: 81 };
const SHAFT_R = 2.6;
const SHAFT_LEN = 60;
const MASTER_R = 7.4;

const DOCKS = [[-84, 42], [-58, 42], [-32, 42], [-6, 42]];
const CRADLE_TOP = 9;
const SHELF = { x: -98, y: 32, w: 106, d: 20, r: 2.5 };
const SHELF_Z = [4, 7];
const HEAD = {
  body: [4.4, 5.6, 6.8, 8],
  bodyH: [5, 6.5, 8, 9.5],
  tip: [2.4, 3.1, 3.8, 4.5],
  tipH: [1.5, 2, 2.5, 3],
  plate: 7,
  neck: 3.4,
};
const HEAD_H = HEAD.bodyH.map((h, i) => 2 + 1.5 + h + HEAD.tipH[i]);
const HEAD_R = HEAD.body.map((r) => Math.max(r, HEAD.plate));

const WORK = [60, 5];
const WORK_TOP = 16;
const VISE = { x: 42, y: -9, w: 44, d: 28, r: 1.5 };
const SAFE = 44;
const REST_Z = WORK_TOP + HEAD_H[M.REST_HEAD] + 5;
const BOX = { x: 70, y: -62, w: 36, d: 26, r: 2 };
const LABEL = { x: 76, y: 40, w: 30, d: 12, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), ...DOCKS.map(([x, y]) => [x, y, SAFE + 4 + SHAFT_LEN + 2]), [WORK[0], WORK[1], SAFE + 4 + SHAFT_LEN + 2]],
  W,
  H,
  { pad: 22, azimuth: 45, elevation: 30 },
);

// Elbow side: the one that keeps the elbow toward the back for every target.
const view = k.towardViewer(P);
// Elbow side: right-handed, so at the vise the elbow stands back and to the right and both links read
// at full length; the stand is reached with the forearm across the bench.
const HAND = -1;

const G = {
  P, S, L1, L2, L1Z, L2Z, hand: HAND, W: WORK, docks: DOCKS, cradleTop: CRADLE_TOP, workTop: WORK_TOP, safe: SAFE, restZ: REST_Z,
  headH: HEAD_H, headR: HEAD_R, heads: HEAD_H.map(() => 0),
  link1R: 12.5, link1Rb: 10.5, link2R: 10.5, link2Rb: 9.5, capR: CAP.r, capH: CAP.h, elbowR: ELBOW.r, elbowTop: ELBOW.top, quillR: QUILL.r, masterR: MASTER_R,
  shaftTop: 4 + SHAFT_LEN + 2,
  column: { r: 21 },
  stand: { seg: [[SHELF.x + 6, 42], [SHELF.x + SHELF.w - 6, 42]], r: 10, top: CRADLE_TOP },
  vise: { seg: [[VISE.x + 5, 5], [VISE.x + VISE.w + 8, 5]], r: 14, top: WORK_TOP },
  dotAlong: [20, 18],
  dotAcross: [6, 5],
};

// ---------- helpers ----------
const at = (p) => k.iso(p, P);
const S_ = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 4, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const cyl = (x, y, r, z, h, steps = 24, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const byDepth = (list, key) => [...list].sort((a, b) => k.depthOf(key(a), P) - k.depthOf(key(b), P));
const loop = (points) => k.pathOf(points.map(at), true);
const ID = (name) => `${SLUG}-${name}`;
const item = (name, inner, extra = "") => `<g data-item="${name}"${extra}>${inner}</g>`;

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
const upward = (x, y, r, z) => k.pathOf(hull(circle(x, y, r, z).flatMap((p) => { const s = at(p); return [s, [s[0], s[1] - 600]]; })), true);
const below = (x, y, z) => { const [sx, sy] = at([x, y, z]); return `M${sx - 300} ${sy}H${sx + 300}V${sy + 600}H${sx - 300}Z`; };
const slotOnX = (x, yc, z0, z1, half) => {
  const points = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; points.push([x, yc + Math.cos(a) * half, z1 - half - Math.sin(a) * half]); }
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI; points.push([x, yc + Math.cos(a) * half, z0 + half - Math.sin(a) * half]); }
  return loop(points);
};

function dynSolid(paths, name, tone = "mid") {
  const d = (value) => value || "";
  const shades = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" data-k="shade${i}" d="${d(paths.shades[i])}"/>`).join("");
  return `<g class="iso-solid" data-part="${name}"><path class="iso-fill" data-k="fill" d="${paths.fill}"/>${shades}<path class="iso-top" data-k="top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="faint" data-k="crease" d="${d(paths.crease)}"/><path class="iso-line iso-bevel" data-tone="faint" data-k="bevel" d="${d(paths.bevel)}"/><path class="iso-line iso-edge" data-tone="${tone}" data-k="edge" d="${paths.outline}"/></g>`;
}

// ---------- base ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 22), ([x, y]) => [x, y, 0])) {
    out.push(S_(cyl(x, y, 7, -BASE_H - FOOT_H, 1.6, 28), { tone: "lo" }));
    out.push(S_(cyl(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28), { tone: "mid" }));
  }
  out.push(S_(slab(BASE, -BASE_H, BASE_H, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BASE, -BASE_H + 4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S_(slab(LABEL, 0, 0.8, 4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([LABEL.x + 6, LABEL.y + 3.6 + row * 2.4], [LABEL.x + (row === 1 ? 18 : 24), LABEL.y + 3.6 + row * 2.4], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([LABEL.x + 3, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------- controller: the machine it runs on ----------
function controller() {
  const out = [];
  const top = 20;
  out.push(S_(slab(BOX, 0, top, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(BOX, 5, P, 4), { tone: "faint" }) }));
  const lid = k.insetPlan(BOX, 1);
  out.push(S_(slab(lid, top, 2, 4, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(lid, 2.4), top + 2, P), { tone: "faint" }));
  out.push(D(k.corners(lid, 3.6).map(([x, y]) => at([x, y, top + 2])), { size: 0.45 }));
  const fx = BOX.x + BOX.w;
  out.push(L([-56, -52, -48, -44, -40].map((y) => slotOnX(fx, y, 7, 15, 0.8)).join(""), { tone: "lo" }));
  // front panel: power switch and a status window
  const fy = BOX.y + BOX.d;
  const win = [[BOX.x + 6, fy, 9], [BOX.x + 20, fy, 9], [BOX.x + 20, fy, 15], [BOX.x + 6, fy, 15]];
  out.push(`<path class="iso-shade" data-shade="1" d="${loop(win)}"/>`);
  out.push(L(loop(win), { tone: "lo" }));
  out.push(L(k.segment([BOX.x + 6, fy, 12], [BOX.x + 20, fy, 12], P), { tone: "faint" }));
  out.push(S_(slab({ x: BOX.x + 27, y: fy, w: 5, d: 1.6, r: 0.6 }, 9, 6, 2), { tone: "mid" }));
  out.push(D([at([BOX.x + 29.5, fy + 1.6, 13.6])], { size: 0.5, tone: "hi" }));
  // plug and cable gland on the lid
  const plug = { x: BOX.x + 6, y: BOX.y + 5, w: 10, d: 7, r: 1.2 };
  out.push(S_(slab(plug, top + 2, 3, 3, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plug, 1.6), top + 5, P, 3), { tone: "lo" }));
  return out.join("");
}

// ---------- cable duct from the controller to the arm's base ----------
function duct() {
  const out = [];
  const runs = [
    { x: S[0] + 21, y: S[1] - 4, w: BOX.x - (S[0] + 21) + 2, d: 8, r: 1 },
  ];
  for (const run of runs) {
    out.push(S_(slab(run, 0, 3, 2, 0.3), { tone: "mid" }));
    out.push(S_(slab(k.insetPlan(run, 0.8), 3, 1, 2, 0.3), { tone: "mid" }));
    const clips = [];
    for (let x = run.x + 10; x < run.x + run.w - 6; x += 18) clips.push(x);
    out.push(L(clips.map((x) => k.lineOnTop([x, run.y + 0.8], [x, run.y + run.d - 0.8], 4, P)).join(""), { tone: "faint" }));
  }
  return out.join("");
}

// ---------- job queue: blanks waiting their turn ----------
function tray() {
  const out = [];
  const plan = { x: 12, y: 38, w: 48, d: 17, r: 2 };
  out.push(S_(slab(plan, 0, 2, 4, 0.4), { tone: "mid" }));
  out.push(S_(slab(k.insetPlan(plan, 1.2), 2, 2.4, 4, 0.4), { tone: "mid" }));
  const inner = k.insetPlan(plan, 3);
  out.push(L(k.planOutline(inner, 4.4, P), { tone: "lo" }));
  const blanks = [0, 1, 2, 3].map((i) => [plan.x + 8 + i * 10.5, plan.y + plan.d / 2]);
  for (const [x, y] of byDepth(blanks, ([x, y]) => [x, y, 0])) {
    const blank = { x: x - 3.6, y: y - 4.4, w: 7.2, d: 8.8, r: 0.6 };
    out.push(S_(slab(blank, 4.4, 3.2, 2, 0.3), { tone: "hi", crease: "lo" }));
  }
  return out.join("");
}

// ---------- drawer cabinet: what the cell keeps between sessions ----------
function cabinet() {
  const out = [];
  const plan = { x: -100, y: -60, w: 34, d: 24, r: 2 };
  const top = 26;
  out.push(S_(slab(plan, 0, top, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(plan, 3).map(([x, y]) => at([x, y, top])), { size: 0.45 }));
  const fy = plan.y + plan.d;
  const rows = [[2, 9], [10, 17], [18, 25]];
  for (const [z0, z1] of rows) {
    const x0 = plan.x + 2.5, x1 = plan.x + plan.w - 2.5;
    out.push(L(loop([[x0, fy, z0], [x1, fy, z0], [x1, fy, z1], [x0, fy, z1]]), { tone: "lo" }));
    const mid = (z0 + z1) / 2;
    const pull = { x: plan.x + plan.w / 2 - 5, y: fy, w: 10, d: 1.6, r: 0.6 };
    out.push(S_(slab(pull, mid - 0.9, 1.8, 2), { tone: "mid" }));
    out.push(L(loop([[plan.x + 5, fy, mid - 1.4], [plan.x + 10, fy, mid - 1.4], [plan.x + 10, fy, mid + 1.4], [plan.x + 5, fy, mid + 1.4]]), { tone: "faint" }));
  }
  return out.join("");
}

// ---------- column ----------
function column() {
  const [x, y] = S;
  const out = [];
  out.push(S_(slab(FLANGE, 0, 3, 4, 0.6), { tone: "mid" }));
  const bolts = k.corners(FLANGE, 4.5);
  out.push(L(bolts.map(([bx, by]) => k.ring(bx, by, 2, 3, P, 14)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([bx, by]) => at([bx, by, 3])), { size: 0.45 }));
  out.push(S_(cyl(x, y, COLUMN_R, 3, 47, 64, 0), { tone: "mid", inner: L([10, 40].map((z) => k.sideArc(x, y, COLUMN_R, z, P, 48)).join(""), { tone: "faint" }) }));
  out.push(S_(cyl(x, y, COLUMN_R + 1.6, 50, 4, 64, 0.6), { tone: "mid" }));
  // connector panel on the column's front
  const panel = { x: x - 5, y: y + COLUMN_R - 1, w: 10, d: 3, r: 0.8 };
  out.push(S_(slab(panel, 16, 12, 2, 0.3), { tone: "mid" }));
  out.push(D([[x - 2.4, 22], [x + 2.4, 22]].map(([px, z]) => at([px, panel.y + panel.d, z])), { size: 0.55, tone: "hi" }));
  return out.join("");
}

// ---------- tool stand ----------
function stand() {
  const out = [];
  for (const lx of [SHELF.x + 3, SHELF.x + SHELF.w - 9]) {
    out.push(S_(slab({ x: lx, y: SHELF.y + 2, w: 6, d: SHELF.d - 4, r: 1 }, 0, SHELF_Z[0], 3, 0.4), { tone: "mid" }));
  }
  out.push(S_(slab(SHELF, SHELF_Z[0], SHELF_Z[1] - SHELF_Z[0], 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(SHELF, 3).map(([x, y]) => at([x, y, SHELF_Z[1]])), { size: 0.45 }));
  DOCKS.forEach(([x, y], i) => {
    out.push(S_(cyl(x, y, 6.4, SHELF_Z[1], CRADLE_TOP - SHELF_Z[1], 40, 0.4), { tone: "mid" }));
    out.push(L(k.ring(x, y, 4.2, CRADLE_TOP, P, 32), { tone: "faint" }));
    // index marks on the shelf: one dot per tier step
    out.push(D(Array.from({ length: i + 1 }, (_, n) => at([x - (i * 1.4) / 2 + n * 1.4, SHELF.y + SHELF.d - 2.2, SHELF_Z[1]])), { size: 0.45, tone: "hi" }));
  });
  return out.join("");
}

// ---------- tool heads ----------
function head(i) {
  const [x, y] = DOCKS[i];
  const out = [];
  let z = CRADLE_TOP;
  out.push(S_(cyl(x, y, HEAD.tip[i], z, HEAD.tipH[i], 24, 0.3), { tone: "hi", crease: "lo" }));
  z += HEAD.tipH[i];
  const seams = i < 2 ? [0.5] : [0.33, 0.66];
  const bodyLines = seams.map((s) => k.sideArc(x, y, HEAD.body[i], z + HEAD.bodyH[i] * s, P, 40)).join("");
  const knurl = i === 3 ? k.knurl(x, y, HEAD.body[i], z + HEAD.bodyH[i] * 0.66, z + HEAD.bodyH[i], 40, P, 0.4) : "";
  out.push(S_(cyl(x, y, HEAD.body[i], z, HEAD.bodyH[i], 40, 0.5), { tone: "hi", crease: "lo", inner: L(bodyLines, { tone: "faint" }) + (knurl ? L(knurl, { tone: "lo" }) : "") }));
  z += HEAD.bodyH[i];
  out.push(S_(cyl(x, y, HEAD.neck, z, 1.5, 24), { tone: "hi", crease: "lo" }));
  z += 1.5;
  out.push(S_(cyl(x, y, HEAD.plate, z, 2, 40, 0.4), { tone: "hi", crease: "lo" }));
  z += 2;
  out.push(L(k.ring(x, y, 3.4, z, P, 32), { tone: "lo" }));
  out.push(D([at([x + 4.3 * Math.cos(Math.PI / 4), y - 4.3 * Math.sin(Math.PI / 4), z]), at([x - 4.3 * Math.cos(Math.PI / 4), y + 4.3 * Math.sin(Math.PI / 4), z])], { size: 0.45, tone: "mid" }));
  return out.join("");
}

// ---------- vise and workpiece ----------
function vise() {
  const out = [];
  const [wx, wy] = WORK;
  out.push(S_(slab(VISE, 0, 5, 4, 0.5), { tone: "mid" }));
  out.push(D([[VISE.x + 3, VISE.y + 3], [VISE.x + 3, VISE.y + VISE.d - 3], [VISE.x + VISE.w - 3, VISE.y + 3], [VISE.x + VISE.w - 3, VISE.y + VISE.d - 3]].map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  out.push(S_(slab({ x: VISE.x, y: VISE.y, w: 7, d: VISE.d, r: 1 }, 5, 11, 3, 0.4), { tone: "mid" }));
  out.push(D([at([VISE.x + 3.5, VISE.y + 5, 16]), at([VISE.x + 3.5, VISE.y + VISE.d - 5, 16])], { size: 0.45 }));
  const piece = { x: VISE.x + 7, y: wy - 8, w: 22, d: 16, r: 0.8 };
  out.push(S_(slab(piece, 5, WORK_TOP - 5, 3, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(wx, wy, 3.6, WORK_TOP, P, 32), { tone: "faint" }));
  out.push(D([[piece.x + 3.4, piece.y + 3.4], [piece.x + 3.4, piece.y + piece.d - 3.4], [piece.x + piece.w - 3.4, piece.y + 3.4], [piece.x + piece.w - 3.4, piece.y + piece.d - 3.4]].map(([x, y]) => at([x, y, WORK_TOP])), { size: 0.5, tone: "lo" }));
  const jaw = VISE.x + 29;
  out.push(S_(slab({ x: jaw, y: VISE.y, w: 7, d: VISE.d, r: 1 }, 5, 10, 3, 0.4), { tone: "mid" }));
  out.push(D([at([jaw + 3.5, VISE.y + 5, 15]), at([jaw + 3.5, VISE.y + VISE.d - 5, 15])], { size: 0.45 }));
  out.push(S_(slab({ x: jaw + 7, y: VISE.y + 4, w: 7, d: VISE.d - 8, r: 1 }, 5, 7, 3, 0.4), { tone: "mid" }));
  out.push(S_(slab({ x: jaw + 14, y: wy - 1.6, w: 8, d: 3.2, r: 1 }, 7.4, 3.2, 2), { tone: "mid", crease: "none" }));
  out.push(S_(slab({ x: jaw + 22, y: wy - 10, w: 2.8, d: 20, r: 1.3 }, 7.2, 3.6, 3, 0.3), { tone: "mid" }));
  return out.join("");
}

// ---------- arm ----------
const rest = reach(WORK, S, L1, L2, HAND);
const REST = joints(rest, S, L1, L2);

function linkItem(name, a, b, ra, rb, [z0, z1], index) {
  const paths = k.extrude(stadium(a, b, ra, rb), z0, z1 - z0, P, { convex: true, bevel: 0.6 });
  const groove = k.onTop(stadium(a, b, ra - 2.6, rb - 2.6), z1, P, true);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const s = G.dotAlong[index];
  const t = G.dotAcross[index];
  const spots = [-t, t].map((tt) => at([a[0] + Math.cos(ang) * s - Math.sin(ang) * tt, a[1] + Math.sin(ang) * s + Math.cos(ang) * tt, z1]));
  const dots = `<g class="iso-dots" data-tone="mid">${spots.map(([x, y]) => `<circle data-part="${name}-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="0.45"/>`).join("")}</g>`;
  return item(name, dynSolid(paths, name) + `<path class="iso-line" data-tone="faint" data-part="${name}-groove" d="${groove}"/>` + dots);
}

function capItem() {
  const [x, y] = S;
  return item("cap", S_(cyl(x, y, CAP.r, L1Z[1], CAP.h, 40, 0.5), { tone: "mid" }) + L(k.ring(x, y, 3, L1Z[1] + CAP.h, P, 24), { tone: "lo" }) + D([at([x, y, L1Z[1] + CAP.h])], { size: 0.5 }));
}

function elbowItem() {
  const out = [];
  out.push(S_(cyl(0, 0, ELBOW.r, L2Z[1], 10, 48, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, ELBOW.r, L2Z[1] + 5, P, 40), { tone: "faint" }) }));
  out.push(S_(cyl(0, 0, 6.4, L2Z[1] + 10, 2, 40, 0.4), { tone: "mid" }));
  out.push(D(Array.from({ length: 4 }, (_, i) => { const a = Math.PI / 4 + (i * Math.PI) / 2; return at([4.4 * Math.cos(a), 4.4 * Math.sin(a), ELBOW.top]); }), { size: 0.45 }));
  return item("elbow", out.join(""), ` data-part="elbow" transform="${k.translateAlong(P, [REST.E[0], REST.E[1], 0])}"`);
}

const shaftZ = REST_Z; // the shaft group is built at the rest height and lifted from there
function shaftRod() {
  return S_(cyl(0, 0, SHAFT_R, shaftZ + 4, SHAFT_LEN, 20), { tone: "mid", crease: "none" });
}

function quillTopItem() {
  const out = [];
  out.push(S_(cyl(0, 0, QUILL.r, L2Z[1], 14, 48, 0.6), { tone: "mid", inner: L(k.sideArc(0, 0, QUILL.r, L2Z[1] + 7, P, 40), { tone: "faint" }) }));
  out.push(S_(cyl(0, 0, 5.6, L2Z[1] + 14, 2, 40, 0.4), { tone: "mid" }));
  out.push(`<g clip-path="url(#${ID("shaft-top")})"><g data-part="shaft">${shaftRod()}${S_(cyl(0, 0, 3.2, shaftZ + 4 + SHAFT_LEN, 2, 24, 0.3), { tone: "mid" })}</g></g>`);
  return item("quill-top", out.join(""), ` data-part="quill-top" transform="${k.translateAlong(P, [REST.Q[0], REST.Q[1], 0])}"`);
}

function quillLowItem() {
  const inner = S_(cyl(0, 0, MASTER_R, shaftZ, 2, 40, 0.4), { tone: "mid" }) + S_(cyl(0, 0, 4.2, shaftZ + 2, 2, 32, 0.3), { tone: "mid" }) + shaftRod();
  return item("quill-low", `<g clip-path="url(#${ID("shaft-low")})"><g data-part="shaft">${inner}</g></g>`, ` data-part="quill-low" transform="${k.translateAlong(P, [REST.Q[0], REST.Q[1], 0])}"`);
}

function headItem(i) {
  const mounted = i === M.REST_HEAD;
  let transform = "";
  if (mounted) transform = ` transform="${k.translateAlong(P, [REST.Q[0] - DOCKS[i][0], REST.Q[1] - DOCKS[i][1], REST_Z - HEAD_H[i] - CRADLE_TOP])}"`;
  const inner = head(i).replace(/<g class="iso-solid"/g, mounted ? '<g class="iso-solid" data-lit=""' : '<g class="iso-solid"');
  return item(`head-${i}`, inner, ` data-part="head-${i}"${transform}`);
}

// ---------- assemble ----------
const BENCH = {
  stand: item("stand", stand()),
  vise: item("vise", vise()),
  column: item("column", column()),
  link1: linkItem("link1", S, REST.E, G.link1R, G.link1Rb, L1Z, 0),
  cap: capItem(),
  link2: linkItem("link2", REST.E, REST.Q, G.link2R, G.link2Rb, L2Z, 1),
  elbow: elbowItem(),
  "quill-top": quillTopItem(),
  "quill-low": quillLowItem(),
};
HEAD_H.forEach((_, i) => { BENCH[`head-${i}`] = headItem(i); });
const heads = HEAD_H.map((_, i) => (i === M.REST_HEAD ? { at: REST.Q, bottom: REST_Z - HEAD_H[i] } : { at: DOCKS[i], bottom: CRADLE_TOP }));
const { list } = itemsOf({ ...rest, z: REST_Z }, heads, G);
const order = orderOf(list, at, view);

const defs = `<defs>
<clipPath id="${ID("shaft-top")}"><path d="${upward(0, 0, SHAFT_R + 0.05, QUILL.top)}"/></clipPath>
<clipPath id="${ID("shaft-low")}"><path d="${below(0, 0, L2Z[0] + 1)}"/></clipPath>
</defs>`;

const body = [defs, base(), cabinet(), duct(), controller(), tray(), `<g data-part="bench">${order.map((index) => BENCH[list[index].name]).join("")}</g>`];

const LABEL_TEXT =
  "A SCARA robot arm on a workbench beside a stand of four tool heads, small to large. For each job the arm returns the head it carries and fetches the smallest one that can do the work; the mounted head is the one that fits.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body });
writeFileSync(join(OUT, `${SLUG}.svg`), svg);

// ---------- live module ----------
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "").replace(/^import .*$/gm, "");
const live = readFileSync(join(HERE, "live.src.js"), "utf8").replace("/*DATA*/", JSON.stringify(G)).replace("/*MODEL*/", strip("model.mjs")).replace("/*RIG*/", strip("rig.mjs"));
writeFileSync(join(OUT, `${SLUG}.live.js`), live);

// ---------- preview pages ----------
const inline = live.replace(/^import .*$/m, "").replace("export function mount", "function mount") + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
const plate = k.plateHtml({
  fig: "Fig 2",
  title: "Tool changer",
  hint: "Move across to pick the job",
  readout: M.readoutOf({ phase: "park", tier: null, head: M.REST_HEAD }),
  keys: [
    { mark: "lit", label: "Mounted head: the model that fits this job" },
    { mark: "raised", label: "Four heads on the stand, small model to reasoning model" },
  ],
  caption:
    "Every job is scored before it starts. The arm puts back the head it carries and fetches the smallest one that can do the work: a small model for a simple job, a reasoning model for a hard one. Every head fits the same coupling, so any model can sit on the stand, a local one included.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Tool changer: number keys 1 to 4 pick the job" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${M.REST_HEAD}">${svg}</div>`,
});
for (const theme of ["light", "dark"]) {
  const file = theme === "light" ? "preview-light.html" : "preview.html";
  writeFileSync(join(HERE, file), k.pageHtml({ title: "unclaude", theme, body: plate, script: kitScript() + inline }));
}
console.log("wrote", `${SLUG}.svg`, `${SLUG}.live.js`, "previews", "scale", P.scale.toFixed(3), "hand", HAND);
