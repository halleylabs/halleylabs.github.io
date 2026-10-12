// node build.mjs  writes the quicky-wiki figure: the bare site SVG, its live module and two preview pages.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WWW = join(HERE, "..", "..");
const SLUG = "quicky-wiki";
const WIDTH = 480;
const HEIGHT = 320;
const AZIMUTH = 50;

// ---------------------------------------------------------------- world
const PLATE = { x: -110, y: -62, w: 220, d: 132, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

const CAB = { x: -72, y: -50, w: 144, d: 54, r: 1.2 };
const FRONT_Y = CAB.y + CAB.d; // 4
const PLINTH_H = 5;
const BODY_TOP = 63;
const CAP_H = 4;
const TOP = BODY_TOP + CAP_H; // 67
const RAIL = 3;
const COLS = 3;
const ROWS = 2;
const COL_W = (CAB.w - RAIL * (COLS + 1)) / COLS;
const ROW_H = (BODY_TOP - PLINTH_H - RAIL * (ROWS + 1)) / ROWS;
const colX = (c) => CAB.x + RAIL + c * (COL_W + RAIL);
const rowZ = (r) => PLINTH_H + RAIL + r * (ROW_H + RAIL);
const FRONT_D = 1.4;
const OPEN = { c: 1, r: 1 };

// the pulled drawer
const PULL = 46;
const BX = colX(OPEN.c) + 1.2;
const BW = COL_W - 2.4;
const BZ = rowZ(OPEN.r) + 1;
const FLOOR_H = 1.5;
const WALL = 1.4;
const WALL_H = 19;
const CARD_Z = BZ + FLOOR_H;
const CARD_H = 22;
const CARD_D = 0.7;
const CARD_YS = M.REST.map((_, index) => 10 + index * 6);

// the balance on top
const BAL = [18, -24];
const PIVOT_Z = 108;
const PIVOT = [BAL[0], BAL[1], PIVOT_Z];
const ARM = 35;
const BEAM_D = 2.4;
const HANG = 23;
const PAN_R = 10;
const POINTER = 26;
const FORK = PIVOT_Z - 9;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [BAL[0], BAL[1], PIVOT_Z + 6], [BAL[0] - ARM, BAL[1], PIVOT_Z - 8], [BAL[0] + ARM, BAL[1], PIVOT_Z - 8]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH, elevation: 30 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const seg = (a, b) => k.pathOf([at(a), at(b)]);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const faceRect = (x0, x1, y, z0, z1) => k.pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);
const sideRect = (x, y0, y1, z0, z1) => k.pathOf([at([x, y0, z0]), at([x, y1, z0]), at([x, y1, z1]), at([x, y0, z1])], true);

// ---------------------------------------------------------------- base
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the front edge
  const strip = { x: -4, y: PLATE.y + PLATE.d - 15, w: 86, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 3, 5, strip.y, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 4.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 4.5, 0.6])], { size: 0.45 }));
  // label plate beside the cabinet
  const plate = { x: 72, y: 12, w: 26, d: 34, r: 1.5 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([plate.x + 6 + row * 2.2, plate.y + 7], [plate.x + 6 + row * 2.2, plate.y + (row === 1 ? 20 : 28)], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([plate.x + plate.w / 2, plate.y + 3.4, 0.8]), at([plate.x + plate.w / 2, plate.y + plate.d - 3.4, 0.8])], { size: 0.45 }));
  // halo of the drawer that hangs out over the bench
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: BX + 2, y: FRONT_Y + 6, w: BW - 4, d: PULL - 4, r: 6 }, 0, 0.1, P)}" style="opacity:.28"/>`);
  return out.join("");
}

// ---------------------------------------------------------------- the pile of documents
function pile() {
  const out = [];
  const tray = { x: -100, y: 14, w: 46, d: 40, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf(tray, 0, 3, P)}" style="opacity:.5"/>`);
  out.push(S(k.slabOf(tray, 0, 3.2, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(tray, 2.4), 3.2, 0.4, P, 3), { tone: "lo", crease: "none" }));
  const sheets = [
    [0, 0, 0],
    [1.2, -0.8, 1],
    [-0.6, 0.9, 2],
    [0.8, 0.4, 3],
    [-0.3, -0.5, 4],
  ];
  sheets.forEach(([dx, dy, i]) => {
    const sheet = { x: tray.x + 6 + dx, y: tray.y + 5 + dy, w: 32, d: 28, r: 0.3 };
    out.push(S(k.slabOf(sheet, 3.6 + i * 1.1, 0.9, P, 2), { tone: i === 4 ? "hi" : "mid", crease: "faint" }));
  });
  const top = { x: tray.x + 5.7, y: tray.y + 4.5, w: 32, d: 28 };
  const zTop = 3.6 + 4 * 1.1 + 0.9;
  const rules = [];
  for (let row = 0; row < 6; row++) {
    const x = top.x + 5 + row * 3.4;
    rules.push(k.lineOnTop([x, top.y + 4], [x, top.y + (row % 3 === 2 ? 15 : 23)], zTop, P));
  }
  out.push(L(rules.join(""), { tone: "lo", free: true }));
  // a bulldog clip holding the pile
  const clip = { x: top.x + 14, y: top.y + top.d - 3.2, w: 8, d: 4.6, r: 0.8 };
  out.push(S(k.slabOf(clip, zTop - 0.2, 1.6, P, 2, 0.3), { tone: "mid" }));
  out.push(D([at([clip.x + 2, clip.y + 2.3, zTop + 1.4]), at([clip.x + 6, clip.y + 2.3, zTop + 1.4])], { size: 0.4 }));
  return out.join("");
}

// ---------------------------------------------------------------- cabinet
function frontDetail(x0, y, z0, out) {
  const cx = x0 + COL_W / 2;
  const hz = z0 + ROW_H * 0.52;
  // label holder, its card and two rivets
  out.push(S(k.slabOf({ x: cx - 7, y, w: 14, d: 0.5, r: 0.3 }, hz, 6, P, 2), { tone: "mid", crease: "faint" }));
  out.push(S(k.slabOf({ x: cx - 5.6, y: y + 0.5, w: 11.2, d: 0.25, r: 0.1 }, hz + 1.1, 3.8, P, 2), { tone: "mid", crease: "none" }));
  out.push(D([at([cx - 6.3, y + 0.5, hz + 3]), at([cx + 6.3, y + 0.5, hz + 3])], { size: 0.38 }));
  // cup pull
  out.push(S(k.slabOf({ x: cx - 5, y, w: 10, d: 2.4, r: 0.9 }, hz - 5, 2.4, P, 3, 0.3), { tone: "mid" }));
  out.push(D([at([cx - 4, y + 0.2, hz - 3.8]), at([cx + 4, y + 0.2, hz - 3.8])], { size: 0.35 }));
  // rod knob: the end of the rod that holds the cards
  out.push(S(k.slabOf({ x: cx - 1.5, y, w: 3, d: 1.1, r: 0.5 }, z0 + 1.9, 3, P, 3, 0.25), { tone: "mid" }));
  out.push(L(k.sideRing([cx, y + 1.1, z0 + 3.4], 0.7, "y", P, 16), { tone: "lo" }));
}

function cabinet() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(CAB, 0, BODY_TOP, P)}" style="opacity:.55"/>`);
  out.push(S(k.slabOf(k.insetPlan(CAB, 2.5), 0, PLINTH_H, P, 3, 0.4), { tone: "lo" }));
  // the carcass, with a panel outline on its side and its rails drawn on the front
  const side = CAB.x + CAB.w;
  const panel = k.pathOf([at([side, CAB.y + 6, PLINTH_H + 6]), at([side, FRONT_Y - 6, PLINTH_H + 6]), at([side, FRONT_Y - 6, BODY_TOP - 6]), at([side, CAB.y + 6, BODY_TOP - 6])], true);
  out.push(S(k.slabOf(CAB, PLINTH_H, BODY_TOP - PLINTH_H, P, 2), { tone: "mid", inner: L(panel, { tone: "faint" }) }));
  // recesses: every drawer sits in its own pocket
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const x0 = colX(c);
      const z0 = rowZ(r);
      out.push(`<path class="iso-shade" data-shade="0" d="${faceRect(x0, x0 + COL_W, FRONT_Y, z0, z0 + ROW_H)}"/>`);
      out.push(L(faceRect(x0, x0 + COL_W, FRONT_Y, z0, z0 + ROW_H), { tone: "lo" }));
    }
  // closed drawers
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (r === OPEN.r && c === OPEN.c) continue;
      const x0 = colX(c);
      const z0 = rowZ(r);
      out.push(S(k.slabOf({ x: x0 + 0.4, y: FRONT_Y, w: COL_W - 0.8, d: FRONT_D, r: 0.5 }, z0 + 0.4, ROW_H - 0.8, P, 2, 0.4), { tone: "mid" }));
      frontDetail(x0, FRONT_Y + FRONT_D, z0, out);
    }
  // the open pocket: the drawer's runners on its side walls
  const ox = colX(OPEN.c);
  const oz = rowZ(OPEN.r);
  out.push(L(seg([ox + COL_W, FRONT_Y, oz + 0.6], [ox + COL_W, FRONT_Y - 0.01, oz + 0.6]), { tone: "lo" }));
  // the cap
  const cap = k.insetPlan(CAB, -2);
  out.push(S(k.slabOf(cap, BODY_TOP, CAP_H, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(cap, BODY_TOP + 1.4, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(cap, 4), TOP, P, 3), { tone: "faint" }));
  // a box of blank cards on the cap, waiting for the next claims
  const box = { x: CAB.x + 10, y: CAB.y + 14, w: 22, d: 26, r: 1 };
  out.push(`<path class="iso-halo" d="${k.haloOf(box, TOP, 2, P)}" style="opacity:.4"/>`);
  out.push(S(k.slabOf(box, TOP, 1.2, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: box.x, y: box.y, w: box.w, d: 1, r: 0.3 }, TOP + 1.2, 7, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: box.x, y: box.y, w: 1, d: box.d, r: 0.3 }, TOP + 1.2, 7, P, 2), { tone: "mid" }));
  [0, 1, 2, 3, 4].forEach((i) => {
    out.push(S(k.slabOf({ x: box.x + 2.2, y: box.y + 3 + i * 4.2, w: box.w - 4.4, d: 0.6, r: 0 }, TOP + 1.2, 9 - (i % 2) * 0.6, P, 1), { tone: "mid", crease: "faint" }));
  });
  out.push(S(k.slabOf({ x: box.x + box.w - 1, y: box.y, w: 1, d: box.d, r: 0.3 }, TOP + 1.2, 7, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: box.x, y: box.y + box.d - 1, w: box.w, d: 1, r: 0.3 }, TOP + 1.2, 7, P, 2), { tone: "mid", inner: L(k.sideSeam({ x: box.x, y: box.y + box.d - 1, w: box.w, d: 1, r: 0.3 }, TOP + 4.2, P, 2), { tone: "faint" }) }));
  out.push(D([at([box.x + 4, box.y + box.d, TOP + 5.6]), at([box.x + box.w - 4, box.y + box.d, TOP + 5.6])], { size: 0.38 }));
  return out.join("");
}

// ---------------------------------------------------------------- the balance
const tilt0 = M.tiltOf(M.REST);
const rad = (deg) => (deg * Math.PI) / 180;
const rot = ([px, pz], deg) => {
  const t = rad(deg);
  return [px * Math.cos(t) + pz * Math.sin(t), -px * Math.sin(t) + pz * Math.cos(t)];
};
const POINTER_Y = BAL[1] + 4.4;
// The beam turns in its own vertical plane, so on screen its turn is one affine map of that plane:
// M R(theta) M^-1 about the pivot, exact for every point of the plane and within 0.2 px for its 2.4 thickness.
function turnOf(deg, y) {
  const ex = k.axisVector(P, [1, 0, 0]);
  const ez = k.axisVector(P, [0, 0, 1]);
  const t = rad(deg);
  const [c, n] = [Math.cos(t), Math.sin(t)];
  // plane coords (x, z) -> (x c + z n, -x n + z c)
  const det = ex[0] * ez[1] - ez[0] * ex[1];
  const inv = [ez[1] / det, -ex[1] / det, -ez[0] / det, ex[0] / det];
  const r = [c, -n, n, c]; // columns: image of x, image of z, in plane coords
  const m = [ex[0] * r[0] + ez[0] * r[1], ex[1] * r[0] + ez[1] * r[1], ex[0] * r[2] + ez[0] * r[3], ex[1] * r[2] + ez[1] * r[3]];
  const a = m[0] * inv[0] + m[2] * inv[1];
  const b = m[1] * inv[0] + m[3] * inv[1];
  const cc = m[0] * inv[2] + m[2] * inv[3];
  const d = m[1] * inv[2] + m[3] * inv[3];
  const [px, py] = at([PIVOT[0], y, PIVOT[2]]);
  const f = (v) => Math.round(v * 10000) / 10000;
  return `matrix(${f(a)} ${f(b)} ${f(cc)} ${f(d)} ${f(px - a * px - cc * py)} ${f(py - b * px - d * py)})`;
}

const endOf = (side, deg) => {
  const [dx, dz] = rot([side * ARM, 0], deg);
  return [PIVOT[0] + dx, PIVOT[1], PIVOT[2] + dz];
};

// the beam, built level; it turns as one piece
function beam() {
  const out = [];
  const [x, y] = BAL;
  const z = PIVOT[2];
  const ticks = k.sideTicks(x - ARM + 2.5, x + ARM - 2.5, 2.5, 4, y + BEAM_D / 2, z + 1, [0.7, 1.3], P);
  out.push(S(k.slabOf({ x: x - ARM - 1.4, y: y - BEAM_D / 2, w: 2 * ARM + 2.8, d: BEAM_D, r: 0.4 }, z - 1, 2, P, 2, 0.3), { tone: "hi", lit: true, inner: L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) }));
  for (const side of [-1, 1]) {
    const ex = x + side * ARM;
    out.push(S(k.slabOf({ x: ex - 1.6, y: y - BEAM_D / 2 - 0.4, w: 3.2, d: BEAM_D + 0.8, r: 0.5 }, z - 1.5, 3, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: x - 5, y: y - BEAM_D / 2 - 0.2, w: 10, d: BEAM_D + 0.4, r: 1 }, z - 2.6, 5.2, P, 3, 0.3), { tone: "mid" }));
  return out.join("");
}

function balanceBack() {
  const out = [];
  const [x, y] = BAL;
  const foot = { x: x - 22, y: y - 7.5, w: 44, d: 15, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf(foot, TOP, 2, P)}" style="opacity:.5"/>`);
  out.push(S(k.slabOf(foot, TOP, 5, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(foot, 1.8), TOP + 5, P, 4), { tone: "faint" }));
  out.push(D([at([foot.x + 4, y, TOP + 5]), at([foot.x + foot.w - 4, y, TOP + 5])], { size: 0.45 }));
  // levelling screws at the two ends of the foot
  for (const sx of [foot.x + 4, foot.x + foot.w - 4]) {
    out.push(S(k.cylinder(sx, y + 4.2, 1.9, TOP + 5, 1.8, P, 20), { tone: "mid" }));
    out.push(L(k.knurl(sx, y + 4.2, 1.9, TOP + 5, TOP + 6.8, 14, P, 0.3), { tone: "lo" }));
  }
  out.push(S(k.cylinder(x, y, 3.8, TOP + 5, 3, P, 28, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.4, TOP + 8, FORK - TOP - 8, P, 24), { tone: "mid", crease: "none", inner: L([TOP + 14, FORK - 6].map((z) => k.sideArc(x, y, 2.4, z, P, 14)).join(""), { tone: "faint" }) }));
  // index plate on the column, ticks hanging from its top edge
  const plate = { x: x - 8, y: y + 2.4, w: 16, d: 0.9, r: 0.3 };
  const tipZ = PIVOT_Z - POINTER;
  out.push(S(k.slabOf(plate, tipZ - 3.5, 6, P, 2), { tone: "mid" }));
  const ticks = k.sideTicks(x - 7, x + 7, 1.75, 4, plate.y + plate.d, tipZ + 2.5, [1.4, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // fork: base and back cheek
  out.push(S(k.slabOf({ x: x - 4.5, y: y - 3.4, w: 9, d: 6.8, r: 1 }, FORK, 2.4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 3.4, y: y - 3.4, w: 6.8, d: 1.6, r: 0.4 }, FORK + 2.4, PIVOT_Z + 4 - FORK - 2.4, P, 2), { tone: "mid" }));
  return out.join("");
}

function balanceFront() {
  const out = [];
  const [x, y] = BAL;
  out.push(S(k.slabOf({ x: x - 3.4, y: y + 1.6, w: 6.8, d: 1.6, r: 0.4 }, FORK + 2.4, PIVOT_Z + 4 - FORK - 2.4, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 2, y: y + 3.2, w: 4, d: 1.2, r: 0.6 }, PIVOT[2] - 2, 4, P, 3, 0.25), { tone: "mid" }));
  out.push(L(k.sideRing([x, y + 4.4, PIVOT[2]], 1.1, "y", P, 20), { tone: "lo" }));
  out.push(D([at([x, y + 4.4, PIVOT[2]])], { size: 0.5, tone: "hi" }));
  return out.join("");
}

// one pan, built at rest (beam level) and moved with its hook
function pan(side, index) {
  const out = [];
  const [hx, hy, hz] = endOf(side, 0);
  const eye = hz - 1.45;
  const cz = hz - HANG;
  const rim = (deg) => [hx + PAN_R * 0.92 * Math.cos(rad(deg)), hy + PAN_R * 0.92 * Math.sin(rad(deg)), cz + 1.4];
  const hook = [hx, hy, eye];
  const back = [210, 330].map((deg) => seg(hook, rim(deg))).join("");
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: hx - PAN_R, y: hy - PAN_R, w: PAN_R * 2, d: PAN_R * 2, r: PAN_R }, TOP, 0.1, P)}" style="opacity:.28"/>`);
  out.push(S(k.cylinder(hx, hy, PAN_R, cz, 1.4, P, 48, 0.4), { tone: "mid" }));
  out.push(L(k.ring(hx, hy, PAN_R - 1.4, cz + 1.4, P, 48), { tone: "faint" }));
  out.push(L(back, { tone: "lo" }));
  // the claim card standing in a clip on the pan
  out.push(S(k.slabOf({ x: hx - 3, y: hy - 1.2, w: 6, d: 2.4, r: 0.5 }, cz + 1.4, 1.6, P, 2, 0.3), { tone: "lo" }));
  const card = { x: hx - 6.2, y: hy - CARD_D / 2, w: 12.4, d: CARD_D, r: 0 };
  const top = cz + 1.4 + 12.5;
  out.push(S(k.slabOf(card, cz + 2.2, top - cz - 2.2, P, 1), { tone: "hi", crease: "lo" }));
  // the same source tab as its twin in the drawer
  const twin = side < 0 ? M.LEFT : M.RIGHT;
  const cardW = BW - 2 * WALL - 2.4;
  const share = (2 + ((twin * 3) % 4) * 6.4) / cardW;
  out.push(S(k.slabOf({ x: card.x + share * card.w, y: card.y, w: (6 / cardW) * card.w, d: CARD_D, r: 0 }, top, 1.4, P, 1), { tone: "hi", crease: "lo" }));
  const fy = hy + CARD_D / 2;
  out.push(L([1.6, 3, 4.4].map((d, row) => seg([hx - 4.6, fy, top - d], [hx + (row === 1 ? 1 : 4), fy, top - d])).join(""), { tone: "lo", free: true }));
  // the front hanger and the hook
  out.push(L(seg(hook, rim(90)), { tone: "lo" }));
  out.push(D(index === 0 ? [at(rim(90)), at(rim(210)), at(rim(330))] : [at(rim(90)), at(rim(210)), at(rim(330))], { size: 0.45, tone: "mid" }));
  out.push(L(k.sideRing([hx, hy + BEAM_D / 2 + 0.3, hz - 0.2], 1.25, "y", P, 18), { tone: "mid" }));
  out.push(D([at(hook)], { size: 0.6, tone: "mid" }));
  return out.join("");
}

function panGroup(side) {
  const [ex, , ez] = endOf(side, tilt0);
  const [rx, , rz] = endOf(side, 0);
  return `<g data-part="pan-${side < 0 ? "left" : "right"}" transform="${k.translateAlong(P, [ex - rx, 0, ez - rz])}">${pan(side, side < 0 ? 0 : 1)}</g>`;
}

// ---------------------------------------------------------------- the pulled drawer
function card(index) {
  const out = [];
  const y = CARD_YS[index];
  const plan = { x: BX + WALL + 1.2, y, w: BW - 2 * WALL - 2.4, d: CARD_D, r: 0 };
  const top = CARD_Z + CARD_H;
  out.push(S(k.slabOf(plan, CARD_Z, CARD_H, P, 1), { tone: "hi", crease: "lo" }));
  // its source: a tab on the top edge, one place per source
  const tx = plan.x + 2 + ((index * 3) % 4) * 6.4;
  out.push(S(k.slabOf({ x: tx, y, w: 6, d: CARD_D, r: 0 }, top, 2.4, P, 1), { tone: "hi", crease: "lo" }));
  const fy = y + CARD_D;
  const lengths = [0.86, 0.6, 0.74];
  out.push(L(lengths.map((f, row) => seg([plan.x + 2.4, fy, top - 2 - row * 1.5], [plan.x + 2.4 + (plan.w - 4.8) * f, fy, top - 2 - row * 1.5])).join(""), { tone: "lo", free: true }));
  return `<g data-part="card-${index}" transform="${k.translateAlong(P, [0, 0, M.REST[index] * M.RISE])}">${out.join("")}</g>`;
}

function drawer() {
  const out = [];
  const y0 = FRONT_Y;
  const y1 = FRONT_Y + PULL;
  // runners under the drawer, coming out of the pocket
  out.push(S(k.slabOf({ x: BX + 3, y: y0, w: 2.4, d: PULL - 6, r: 0.3 }, BZ - 1.6, 1.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf({ x: BX + BW - 5.4, y: y0, w: 2.4, d: PULL - 6, r: 0.3 }, BZ - 1.6, 1.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf({ x: BX, y: y0, w: BW, d: PULL, r: 0.3 }, BZ, FLOOR_H, P, 2), { tone: "lo" }));
  out.push(S(k.slabOf({ x: BX, y: y0, w: BW, d: WALL, r: 0.2 }, BZ + FLOOR_H, WALL_H - FLOOR_H, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BX, y: y0, w: WALL, d: PULL, r: 0.2 }, BZ + FLOOR_H, WALL_H - FLOOR_H, P, 2), { tone: "mid" }));
  // the rod along the bottom, through every card's slot
  out.push(S(k.slabOf({ x: BX + BW / 2 - 0.9, y: y0 + WALL, w: 1.8, d: PULL - WALL, r: 0.8 }, CARD_Z + 1.5, 1.8, P, 3), { tone: "mid", crease: "none" }));
  // follower block behind the cards, with its thumb lever
  const fol = { x: BX + WALL + 2, y: y0 + WALL + 0.6, w: BW - 2 * WALL - 4, d: 3.4, r: 0.4 };
  out.push(S(k.slabOf(fol, CARD_Z, 13, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BX + BW / 2 - 1.5, y: fol.y + 1, w: 3, d: 1.6, r: 0.4 }, CARD_Z + 13, 3, P, 2), { tone: "mid" }));
  M.REST.forEach((_, index) => out.push(card(index)));
  out.push(S(k.slabOf({ x: BX + BW - WALL, y: y0, w: WALL, d: PULL, r: 0.2 }, BZ + FLOOR_H, WALL_H - FLOOR_H, P, 2), { tone: "mid" }));
  // the drawer front
  const x0 = colX(OPEN.c);
  const z0 = rowZ(OPEN.r);
  out.push(S(k.slabOf({ x: x0 + 0.4, y: y1, w: COL_W - 0.8, d: FRONT_D, r: 0.5 }, z0 + 0.4, ROW_H - 0.8, P, 2, 0.4), { tone: "mid" }));
  frontDetail(x0, y1 + FRONT_D, z0, out);
  return out.join("");
}

// ---------------------------------------------------------------- assemble
const LABEL =
  "A card catalogue cabinet with one drawer pulled out. Each claim card in the drawer stands as tall as its confidence. On top of the cabinet a small balance weighs two claims that contradict each other, and its beam tips toward the claim with more confidence.";

const body = [
  base(),
  pile(),
  cabinet(),
  balanceBack(),
  `<g data-part="beam" transform="${turnOf(tilt0, BAL[1])}">${beam()}</g>`,
  balanceFront(),
  `<g data-part="pointer" transform="${turnOf(tilt0, POINTER_Y)}"><path class="iso-line" data-tone="hi" data-free="end" d="${seg([PIVOT[0], POINTER_Y, PIVOT[2] - 2.4], [PIVOT[0], POINTER_Y, PIVOT[2] - POINTER])}" style="stroke-width:.9"/></g>`,
  panGroup(-1),
  panGroup(1),
  drawer(),
];

const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body });
writeFileSync(join(WWW, "src", "figures", `${SLUG}.svg`), svg + "\n");

// ---------------------------------------------------------------- live
const DATA = {
  P,
  REST: M.REST,
  TOUR: M.TOUR,
  HOVER: M.HOVER,
  STEP: M.STEP_SECONDS,
  RISE: M.RISE,
  LEFT: M.LEFT,
  RIGHT: M.RIGHT,
  TILT_PER: M.TILT_PER,
  TILT_MOST: M.TILT_MOST,
  PIVOT,
  ARM,
  BEAM_Y: BAL[1],
  POINTER_Y,
};

const LIVE = `
const D = ${JSON.stringify(DATA)};
const rad = (deg) => (deg * Math.PI) / 180;
const rot = ([px, pz], deg) => { const t = rad(deg); return [px * Math.cos(t) + pz * Math.sin(t), -px * Math.sin(t) + pz * Math.cos(t)]; };
const tiltOf = (c) => Math.max(-D.TILT_MOST, Math.min(D.TILT_MOST, (c[D.RIGHT] - c[D.LEFT]) * D.TILT_PER));
const endOf = (side, deg) => { const [dx, dz] = rot([side * D.ARM, 0], deg); return [D.PIVOT[0] + dx, D.PIVOT[1], D.PIVOT[2] + dz]; };
const sayOf = (c) => { const t = tiltOf(c); return Math.abs(t) < 1.5 ? "contradiction in the balance" : t > 0 ? "right claim outweighs left" : "left claim outweighs right"; };

export function mount(root, { mode = "hover" } = {}) {
  const svg = root.querySelector("svg");
  if (!svg) return { destroy() {} };
  const cards = D.REST.map((_, i) => svg.querySelector('[data-part="card-' + i + '"]'));
  const beam = svg.querySelector('[data-part="beam"]');
  const pointer = svg.querySelector('[data-part="pointer"]');
  const pans = [-1, 1].map((side) => [side, svg.querySelector('[data-part="pan-' + (side < 0 ? "left" : "right") + '"]')]);
  const plate = root.closest(".iso-plate");
  const readout = (plate && plate.querySelector("[data-readout]")) || root.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const P = D.P;
  const at = (p) => iso(p, P);

  const c = D.REST.map((v) => ({ x: v, v: 0 }));
  const tilt = { x: tiltOf(D.REST), v: 0 };
  let target = D.REST.slice();
  let words = mode === "tour" ? D.TOUR[0].say : "";
  let frame = 0, last = 0, clock = 0, visible = false, touring = mode === "tour" && !still.matches, idle = 0, drawnTilt = NaN;

  const say = (text) => { if (readout && text && readout.textContent !== text) readout.textContent = text; };
  const ex = axisVector(P, [1, 0, 0]), ez = axisVector(P, [0, 0, 1]);
  const det = ex[0] * ez[1] - ez[0] * ex[1];
  function turnOf(deg, y) {
    const t = rad(deg), c = Math.cos(t), n = Math.sin(t);
    const m = [ex[0] * c - ez[0] * n, ex[1] * c - ez[1] * n, ex[0] * n + ez[0] * c, ex[1] * n + ez[1] * c];
    const i0 = ez[1] / det, i1 = -ex[1] / det, i2 = -ez[0] / det, i3 = ex[0] / det;
    const a = m[0] * i0 + m[2] * i1, b = m[1] * i0 + m[3] * i1, cc = m[0] * i2 + m[2] * i3, d = m[1] * i2 + m[3] * i3;
    const [px, py] = at([D.PIVOT[0], y, D.PIVOT[2]]);
    const f = (v) => Math.round(v * 10000) / 10000;
    return "matrix(" + [a, b, cc, d, px - a * px - cc * py, py - b * px - d * py].map(f).join(" ") + ")";
  }
  function drawBeam(deg) {
    if (Math.abs(deg - drawnTilt) < 0.002) return;
    drawnTilt = deg;
    beam.setAttribute("transform", turnOf(deg, D.BEAM_Y));
    pointer.setAttribute("transform", turnOf(deg, D.POINTER_Y));
    for (const [side, node] of pans) {
      const e = endOf(side, deg), r = endOf(side, 0);
      node.setAttribute("transform", translateAlong(P, [e[0] - r[0], 0, e[2] - r[2]]));
    }
  }
  function draw() {
    c.forEach((s, i) => cards[i] && cards[i].setAttribute("transform", translateAlong(P, [0, 0, s.x * D.RISE])));
    drawBeam(tilt.x);
  }
  function spring(s, want, dt, stiff, drag, calm) {
    if (calm) { s.x = want; s.v = 0; return false; }
    const n = 4, h = dt / n;
    for (let i = 0; i < n; i++) { s.v += ((want - s.x) * stiff - s.v * drag) * h; s.x += s.v * h; }
    if (Math.abs(want - s.x) < 1e-4 && Math.abs(s.v) < 1e-4) { s.x = want; s.v = 0; return false; }
    return true;
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (touring) {
      clock += dt;
      const step = D.TOUR[Math.floor(clock / D.STEP) % D.TOUR.length];
      target = step.c;
      words = step.say;
    }
    let moving = false;
    c.forEach((s, i) => { moving = spring(s, target[i], dt, 46, 7.4, calm) || moving; });
    // the beam answers the confidences on its pans, and swings a little before it settles
    moving = spring(tilt, tiltOf(c.map((s) => s.x)), dt, 24, 4.2, calm) || moving;
    draw();
    say(words);
    frame = visible && (touring || moving) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else if (frame) { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: "120px 0px" });
  io.observe(root);

  const handlers = [];
  const on = (node, type, fn) => { node.addEventListener(type, fn); handlers.push([node, type, fn]); };
  if (mode === "hover") {
    on(root, "pointerenter", () => { target = D.HOVER.c; words = D.HOVER.say; run(); });
    on(root, "pointerleave", () => { target = D.REST; words = D.TOUR[0].say; run(); });
  } else {
    const steer = (share) => {
      touring = false;
      const s = Math.min(1, Math.max(0, share));
      target = D.REST.map((v, i) => (i === D.LEFT ? 0.9 - 0.78 * s : i === D.RIGHT ? 0.12 + 0.78 * s : v));
      words = sayOf(target);
      clearTimeout(idle);
      idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
      run();
    };
    let share = 0.5;
    on(root, "pointermove", (event) => {
      const box = svg.getBoundingClientRect();
      share = ((event.clientX - box.left) / box.width - 0.2) / 0.6;
      steer(share);
    });
    on(root, "keydown", (event) => {
      const step = event.shiftKey ? 0.3 : 0.1;
      if (event.key === "ArrowRight") share = Math.min(1, share + step);
      else if (event.key === "ArrowLeft") share = Math.max(0, share - step);
      else return;
      event.preventDefault();
      steer(share);
    });
  }
  draw();
  say(words);
  return {
    destroy() {
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(idle);
      for (const [node, type, fn] of handlers) node.removeEventListener(type, fn);
    },
  };
}
`;

const MODULE = `// Generated by www/figures/${SLUG}/build.mjs. Do not edit by hand.
import { iso, translateAlong, axisVector } from "../../vendor/anatomy/kit/iso-kit.mjs";
${LIVE}`;
writeFileSync(join(WWW, "src", "figures", `${SLUG}.live.js`), MODULE);

// ---------------------------------------------------------------- previews
const script = kitScript() + LIVE.replace("export function mount", "function mount") + `\nconst stage = document.querySelector(".iso-stage");\nmount(stage, { mode: "tour" });\n`;

const plate = k.plateHtml({
  fig: "Fig 1",
  title: "Quicky Wiki",
  hint: "Move across to weigh the evidence",
  readout: M.TOUR[0].say,
  keys: [
    { mark: "lit", label: "Balance beam: tips toward the claim with more confidence" },
    { mark: "raised", label: "Claim cards: each stands as tall as its confidence" },
  ],
  caption:
    "Every claim pulled from your documents becomes a card that stands as tall as its confidence, with a tab for its source. When two claims disagree, both go on the balance. Each new source raises some cards and lowers others, and the beam settles on the side the evidence supports.",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Card catalogue: move across or use the arrow keys to add evidence for the left or right claim">${svg}</div>`,
});
for (const theme of ["light", "dark"]) {
  const file = theme === "light" ? "preview-light.html" : "preview.html";
  writeFileSync(join(HERE, file), k.pageHtml({ title: "Quicky Wiki", theme, body: plate, script, width: 560 }));
}
console.log("wrote", `src/figures/${SLUG}.svg`, `src/figures/${SLUG}.live.js`, "preview-light.html", "preview.html", `· ${(svg.length / 1024).toFixed(1)} KB svg`);
