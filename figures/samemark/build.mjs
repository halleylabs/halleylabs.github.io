// samemark anatomy figure: a small fly press that prints a paper ribbon one line per stroke.
// node build.mjs writes src/figures/samemark.svg, src/figures/samemark.live.js,
// and the two preview pages beside this file.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import { ANSWER, CYCLE, CYCLE_T, HOLE_PITCH, LINES, METRICS, PITCH, STROKE, SWING, readoutOf } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src", "figures");
const W = 480;
const H = 320;

// ---------- world plan ----------
const PLATE = { x: -118, y: -72, w: 228, d: 132, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const XP = -26; // print line under the platen
const BED = { x: -66, y: -22, w: 124, d: 44, r: 3 };
const BED_H = 8;
const ZR = 8.5; // ribbon top
const RIB = { x0: -104, x1: 58.6, y: 13 };
const NOSE = 58; // bed end, where the ribbon turns down
const OUT_Z = 5.3; // top of the received stack

const COL = { x: XP - 8, y: -54, w: 16, d: 14, r: 2 };
const COL_FOOT = { x: XP - 12, y: -58, w: 24, d: 22, r: 3 };
const ARM = { x: XP - 6, y: -54, w: 12, d: 50, r: 2 };
const ARM_Z = 48;
const ARM_H = 8;
const SLEEVE = { r: 6, z0: 46.5, z1: 60 };
const SCREW_R = 2.6;
const CHASE = { x: XP - 5, y: -13, w: 10, d: 26, r: 0.6 };
const CHASE_Z = ZR + STROKE; // 16 at rest
const CHASE_H = 3;
const HEAD = { x: XP - 6, y: -14, w: 12, d: 28, r: 1.4 };
const HEAD_Z = CHASE_Z + CHASE_H; // 19
const HEAD_H = 8.5;
const FLANGE_Z = HEAD_Z + HEAD_H; // 27.5
const BOSS = { r: 4.6, z0: 68.5, h: 4.5 };
const BAR = { z0: BOSS.z0 + BOSS.h, h: 3, half: 1.7, reach: 25.9 };
const WEIGHT = { r: 4.6, at: 30, z0: BAR.z0 + 1.5 - 3, h: 6 };
const PHI0 = (-80 * Math.PI) / 180;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...Array.from({ length: 24 }, (_, i) => [XP + 35 * Math.cos((i / 24) * Math.PI * 2), 35 * Math.sin((i / 24) * Math.PI * 2), WEIGHT.z0 + WEIGHT.h + 10]),
  ],
  W,
  H,
  { pad: 22, azimuth: 45, elevation: 30 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const slab = (plan, z, h, steps = 4, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const cyl = (x, y, r, z, h, steps = 28, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const quad = (pts) => k.pathOf(pts.map(at), true);
const seam = (plan, z, steps = 4) => L(k.sideSeam(plan, z, P, steps), { tone: "faint" });

// A solid whose paths the live code rewrites each frame: every path is tagged.
function liveSolid(paths, { tone = "mid", part, crease = "faint", lit = false } = {}) {
  const shades = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" data-k="s${i}" d="${paths.shades[i] || ""}"/>`).join("");
  return `<g class="iso-solid" data-part="${part}"${lit ? " data-lit" : ""}><path class="iso-fill" data-k="fill" d="${paths.fill}"/>${shades}<path class="iso-top" data-k="top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="${crease}" data-k="crease" d="${paths.crease}"/><path class="iso-line iso-edge" data-tone="${tone}" data-k="outline" d="${paths.outline}"/></g>`;
}

// ---------- base ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(cyl(x, y, 7, -PLATE_H - FOOT_H, 1.6), { tone: "lo" }));
    out.push(S(cyl(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6), { tone: "lo" }));
  }
  out.push(S(slab(PLATE, -PLATE_H, PLATE_H, 8, 1.6), { tone: "lo", inner: seam(PLATE, -5, 8) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // engraved label plate: three rule lines stand for the maker's text
  const lab = { x: -104, y: 36, w: 46, d: 13, r: 1.6 };
  out.push(S(slab(lab, 0, 0.8, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(lab, 1.5), 0.8, P, 4), { tone: "faint" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([lab.x + 8, lab.y + 3.8 + row * 2.6], [lab.x + (row === 1 ? 28 : 38), lab.y + 3.8 + row * 2.6], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([lab.x + 3.6, lab.y + lab.d / 2, 0.8]), at([lab.x + lab.w - 3.6, lab.y + lab.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------- press column ----------
function column() {
  const out = [];
  out.push(S(slab(COL_FOOT, 0, 2.4, 4, 0.6), { tone: "mid" }));
  const fs = k.corners(COL_FOOT, 3.2);
  out.push(L(fs.map(([x, y]) => k.ring(x, y, 1.4, 2.4, P, 12)).join(""), { tone: "lo" }));
  out.push(D(fs.map(([x, y]) => at([x, y, 2.4])), { size: 0.45 }));
  const xf = COL.x + COL.w, yf = COL.y + COL.d;
  const panels = k.pathOf([[xf, COL.y + 3.5, 9], [xf, yf - 3.5, 9], [xf, yf - 3.5, 38], [xf, COL.y + 3.5, 38]].map(at), true) + k.pathOf([[COL.x + 3.5, yf, 9], [xf - 3.5, yf, 9], [xf - 3.5, yf, 34], [COL.x + 3.5, yf, 34]].map(at), true);
  out.push(S(slab(COL, 2.4, ARM_Z - 2.4, 4, 0.6), { tone: "mid", inner: seam(COL, 5.5) + L(panels, { tone: "faint" }) }));
  // corbel under the arm, bolted to the column face
  const corbel = { x: XP - 5, y: yf, w: 10, d: 5, r: 0.8 };
  out.push(S(slab(corbel, 38, ARM_Z - 38, 3, 0.4), { tone: "mid" }));
  out.push(D([at([XP - 2.5, yf + 5, 41]), at([XP + 2.5, yf + 5, 41])], { size: 0.4 }));
  return out.join("");
}

function arm() {
  const out = [];
  out.push(S(slab(ARM, ARM_Z, ARM_H, 4, 0.6), { tone: "mid", inner: seam(ARM, ARM_Z + 2.2) }));
  out.push(L(k.lineOnTop([XP, ARM.y + 3], [XP, -9], ARM_Z + ARM_H, P), { tone: "faint" }));
  out.push(D([at([XP, ARM.y + 3, ARM_Z + ARM_H]), at([XP, ARM.y + 9, ARM_Z + ARM_H])], { size: 0.5 }));
  return out.join("");
}

function sleeve() {
  const out = [];
  out.push(S(cyl(XP, 0, SLEEVE.r + 0.8, SLEEVE.z0 - 2.5, 2.5, 36), { tone: "mid" }));
  out.push(S(cyl(XP, 0, SLEEVE.r, SLEEVE.z0, SLEEVE.z1 - SLEEVE.z0, 36, 0.5), { tone: "mid", inner: L(k.sideArc(XP, 0, SLEEVE.r, SLEEVE.z1 - 3, P, 24), { tone: "faint" }) }));
  out.push(L(k.ring(XP, 0, SCREW_R + 0.9, SLEEVE.z1, P, 24), { tone: "lo" }));
  // lock screw on the sleeve side
  out.push(S(slab({ x: XP + SLEEVE.r - 0.4, y: -1.2, w: 3.4, d: 2.4, r: 0.6 }, 51.5, 2.4, 2), { tone: "mid", crease: "none" }));
  out.push(S(cyl(XP + SLEEVE.r + 4.6, 0, 2.2, 49.8, 5.8, 20), { tone: "mid" }));
  out.push(L(k.knurl(XP + SLEEVE.r + 4.6, 0, 2.2, 49.8, 55.6, 16, P), { tone: "lo" }));
  return out.join("");
}

// ---------- feed and delivery ----------
function infeed() {
  const out = [];
  const floor = { x: -108, y: -19, w: 38, d: 38, r: 2 };
  out.push(S(slab(floor, 0, 2, 4, 0.5), { tone: "mid" }));
  out.push(S(slab({ x: -108, y: -19, w: 2.5, d: 38, r: 0.8 }, 2, 7, 3), { tone: "mid" }));
  out.push(S(slab({ x: -108, y: -19, w: 36, d: 2.5, r: 0.8 }, 2, 7, 3), { tone: "mid" }));
  for (let i = 0; i < 5; i++) {
    const sheet = { x: RIB.x0, y: -RIB.y, w: 30, d: RIB.y * 2, r: 0.3 };
    out.push(S(slab(sheet, 2 + i * 1.2, 1.2, 2), { tone: "hi", crease: "lo" }));
  }
  return out.join("");
}

function infeedFront() {
  return S(slab({ x: -108, y: 16.5, w: 34, d: 2.5, r: 0.8 }, 2, 7, 3), { tone: "mid" }) + D([at([-105, 17.75, 9]), at([-77, 17.75, 9])], { size: 0.4 });
}

function bed() {
  const out = [];
  out.push(S(slab(BED, 0, BED_H, 6, 1), { tone: "mid", inner: seam(BED, 3, 6) }));
  out.push(D([-56, -36, 2, 46].map((x) => at([x, BED.y + BED.d, 5.6])), { size: 0.45 }));
  out.push(D([[-62, -19], [54, -19], [-62, 19], [54, 19]].map(([x, y]) => at([x, y, BED_H])), { size: 0.45 }));
  // back guide
  const guide = { x: -62, y: -17.2, w: 116, d: 2.6, r: 0.6 };
  out.push(S(slab(guide, BED_H, 1.2, 2, 0.3), { tone: "mid" }));
  out.push(D([guide.x + 3, XP - 14, XP + 14, 50].map((x) => at([x, guide.y + 1.3, BED_H + 1.2])), { size: 0.35 }));
  // front guide, ruled in line pitches
  const rule = { x: -14, y: 14.5, w: 68, d: 6, r: 0.8 };
  out.push(S(slab(rule, BED_H, 0.8, 3), { tone: "mid", crease: "none" }));
  const t = k.topTicks(XP + 2 * PITCH, 50, PITCH / 2, 2, rule.y + 0.8, BED_H + 0.8, [1.6, 3], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([rule.x + 2, rule.y + 3, BED_H + 0.8]), at([rule.x + rule.w - 2, rule.y + 3, BED_H + 0.8])], { size: 0.4 }));
  return out.join("");
}

function ribbon() {
  const out = [];
  const plan = { x: RIB.x0, y: -RIB.y, w: RIB.x1 - RIB.x0, d: RIB.y * 2, r: 0 };
  out.push(S(slab(plan, ZR - 0.5, 0.5, 1), { tone: "hi", flat: true }));
  // tractor holes, fed with the ribbon and clipped to it
  const holes = [];
  for (let x = RIB.x0 - 2; x <= RIB.x1; x += HOLE_PITCH) for (const y of [-11, 11]) holes.push(at([x, y, ZR]));
  const clip = quad([[RIB.x0, -RIB.y, ZR], [RIB.x1, -RIB.y, ZR], [RIB.x1, RIB.y, ZR], [RIB.x0, RIB.y, ZR]]);
  out.push(`<clipPath id="sm-rib"><path d="${clip}"/></clipPath>`);
  out.push(`<g clip-path="url(#sm-rib)"><g data-part="holes">${D(holes, { size: 0.55, tone: "lo" })}</g></g>`);
  return out.join("");
}

// Printed lines: twelve slots spaced one pitch apart from the print line.
const SLOTS = 11;
function lineMarkup(index) {
  const line = LINES[index];
  let d = line.spans.map(([a, b]) => k.lineOnTop([XP, a], [XP, b], ZR, P)).join("");
  if (line.kind === "item") d += k.ring(XP, -8.3, 0.45, ZR, P, 10);
  return { d, heading: line.kind === "heading" };
}
const LINE_MARKS = LINES.map((_, i) => lineMarkup(i));

function slotsMarkup(lineOfSlot, newest) {
  const out = [];
  for (let j = 0; j < SLOTS; j++) {
    const index = lineOfSlot[j];
    const mark = index >= 0 ? LINE_MARKS[index] : { d: "", heading: false };
    const tone = index >= 0 && index === newest - 1 && j === 1 ? "lit" : "mid";
    const x = XP + PITCH * j;
    const alpha = fadeAt(x);
    out.push(
      `<g data-part="line" data-slot="${j}" transform="${k.translateAlong(P, [PITCH * j, 0, 0])}"${alpha < 1 ? ` opacity="${alpha.toFixed(2)}"` : ""}${index < 0 ? ' style="display:none"' : ""}>` +
        `<path class="iso-line" data-tone="${tone}" data-free="" d="${mark.d || "M0 0"}" style="stroke-width:${tone === "lit" ? 1.05 : 0.75}"/>` +
        `</g>`,
    );
  }
  return `<g data-part="lines">${out.join("")}</g>`;
}
function fadeAt(x) {
  const s = Math.max(0, Math.min(1, (NOSE - 2 - x) / 9));
  return s * s * (3 - 2 * s);
}

function delivery() {
  const out = [];
  // the ribbon turns over the bed end and drops into the delivery tray
  out.push(S(k.extrude([[NOSE, -RIB.y], [RIB.x1, -RIB.y], [RIB.x1, RIB.y], [NOSE, RIB.y]], OUT_Z, ZR - 0.5 - OUT_Z, P), { tone: "hi", crease: "none" }));
  const floor = { x: RIB.x1, y: -19, w: 32, d: 38, r: 2 };
  out.push(S(slab(floor, 0, 1.5, 4, 0.5), { tone: "mid" }));
  out.push(S(slab({ x: RIB.x1, y: -19, w: 32, d: 2.5, r: 0.8 }, 1.5, 6.5, 3), { tone: "mid" }));
  for (let i = 0; i < 4; i++) {
    const sheet = { x: RIB.x1, y: -RIB.y, w: 26, d: RIB.y * 2, r: 0.3 };
    out.push(S(slab(sheet, 1.5 + i * 0.95, 0.95, 2), { tone: "hi", crease: "lo" }));
  }
  const holes = [];
  for (let x = RIB.x1 + 2.4; x < RIB.x1 + 25; x += HOLE_PITCH) for (const y of [-11, 11]) holes.push(at([x, y, OUT_Z]));
  out.push(D(holes, { size: 0.55, tone: "lo" }));
  // last page of the previous answer, printed and kept
  for (let i = 0; i < 3; i++) {
    const x = RIB.x1 + 5 + i * PITCH;
    const spans = LINES[9 + i].spans;
    out.push(L(spans.map(([a, b]) => k.lineOnTop([x, a], [x, b], OUT_Z, P)).join(""), { tone: "mid", free: true }));
  }
  return out.join("");
}

function deliveryFront() {
  const out = [];
  out.push(S(slab({ x: RIB.x1 + 29.5, y: -19, w: 2.5, d: 38, r: 0.8 }, 1.5, 6.5, 3), { tone: "mid" }));
  out.push(S(slab({ x: RIB.x1, y: 16.5, w: 32, d: 2.5, r: 0.8 }, 1.5, 6.5, 3), { tone: "mid" }));
  out.push(D([at([RIB.x1 + 3, 17.75, 8]), at([RIB.x1 + 29, 17.75, 8])], { size: 0.4 }));
  return out.join("");
}

// ---------- galley: the answer as set type, waiting ----------
const GALLEY = { x: 50, y: 28, w: 52, d: 24, r: 1.6 };
function galley() {
  const out = [];
  const g = GALLEY;
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(g, 2), 0, 2, P)}" style="filter:blur(4px)"/>`);
  out.push(S(slab(g, 0, 1.2, 4, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: g.x, y: g.y, w: g.w, d: 2, r: 0.6 }, 1.2, 3.4, 2), { tone: "mid" }));
  out.push(S(slab({ x: g.x, y: g.y, w: 2, d: g.d, r: 0.6 }, 1.2, 3.4, 2), { tone: "mid" }));
  // twelve slugs packed side by side, one per line of the answer; each carries its words on top
  LINES.forEach((line, i) => {
    const x = g.x + 2 + i * 4;
    const plan = { x, y: g.y + 2, w: 4, d: g.d - 4, r: 0.2 };
    const mid = plan.y + plan.d / 2;
    const words = line.spans.map(([a, b]) => k.lineOnTop([x + 2, mid + a], [x + 2, mid + b], 3.2, P)).join("") + (line.kind === "item" ? k.ring(x + 2, mid - 8.3, 0.45, 3.2, P, 10) : "");
    out.push(S(slab(plan, 1.2, 2, 2), { tone: "mid", crease: "faint" }));
    out.push(L(words, { tone: "lo", free: true }));
  });
  out.push(S(slab({ x: g.x + g.w - 2, y: g.y, w: 2, d: g.d, r: 0.6 }, 1.2, 3.4, 2), { tone: "mid" }));
  out.push(S(slab({ x: g.x, y: g.y + g.d - 2, w: g.w, d: 2, r: 0.6 }, 1.2, 3.4, 2), { tone: "mid" }));
  out.push(D([at([g.x + 1, g.y + g.d - 1, 4.6]), at([g.x + g.w - 1, g.y + g.d - 1, 4.6])], { size: 0.4 }));
  return out.join("");
}

// ---------- feed knob ----------
const KNOB = { x: 31, y: 26.5, r: 4.5, z: BED_H, h: 4.5 };
function knob() {
  const out = [];
  const bracket = { x: 24.5, y: 22, w: 13, d: 9, r: 1.2 };
  out.push(S(slab(bracket, 1, BED_H - 1, 3, 0.4), { tone: "mid" }));
  out.push(S(cyl(KNOB.x, KNOB.y, KNOB.r, KNOB.z, KNOB.h, 32, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(KNOB.x, KNOB.y, KNOB.r, KNOB.z, KNOB.z + KNOB.h, 30, P), { tone: "lo" }));
  out.push(L(k.ring(KNOB.x, KNOB.y, KNOB.r - 1.2, KNOB.z + KNOB.h, P, 28), { tone: "faint" }));
  return out.join("");
}
const pointerAt = (turn) => {
  const a = turn * Math.PI * 2;
  return k.lineOnTop([KNOB.x - Math.sin(a) * 1.1, KNOB.y + Math.cos(a) * 1.1], [KNOB.x + Math.sin(a) * (KNOB.r - 1.2), KNOB.y - Math.cos(a) * (KNOB.r - 1.2)], KNOB.z + KNOB.h, P);
};

// ---------- moving head: chase of type, platen, screw ----------
function headGroup() {
  const out = [];
  const sorts = [];
  for (let i = 1; i < 12; i++) sorts.push(k.segment([CHASE.x + CHASE.w, CHASE.y + i * (CHASE.d / 12), CHASE_Z], [CHASE.x + CHASE.w, CHASE.y + i * (CHASE.d / 12), HEAD_Z], P));
  for (let i = 1; i < 4; i++) sorts.push(k.segment([CHASE.x + i * (CHASE.w / 4), CHASE.y + CHASE.d, CHASE_Z], [CHASE.x + i * (CHASE.w / 4), CHASE.y + CHASE.d, HEAD_Z], P));
  out.push(S(slab(CHASE, CHASE_Z, CHASE_H, 2), { tone: "hi", crease: "lo", inner: L(sorts.join(""), { tone: "lo" }) }));
  out.push(S(slab(HEAD, HEAD_Z, HEAD_H, 4, 0.6), { tone: "mid", inner: seam(HEAD, HEAD_Z + 2.4) }));
  const hs = k.corners(HEAD, 2.4);
  out.push(D(hs.map(([x, y]) => at([x, y, FLANGE_Z])), { size: 0.45 }));
  out.push(S(cyl(XP, 0, 4.4, FLANGE_Z, 2, 28, 0.4), { tone: "mid" }));
  out.push(D([0, 1, 2, 3].map((i) => at([XP + 3.1 * Math.cos(i * Math.PI / 2 + 0.6), 3.1 * Math.sin(i * Math.PI / 2 + 0.6), FLANGE_Z + 2])), { size: 0.35 }));
  const threads = [];
  for (let z = FLANGE_Z + 3.2; z < SLEEVE.z1 - 0.4; z += 2.4) threads.push(k.sideArc(XP, 0, SCREW_R, z, P, 14));
  out.push(S(cyl(XP, 0, SCREW_R, FLANGE_Z + 2, SLEEVE.z1 - FLANGE_Z - 2, 20), { tone: "mid", crease: "none", inner: L(threads.join(""), { tone: "lo" }) }));
  return out.join("");
}

// The parts above the sleeve, rebuilt by the live code as the screw turns and drops.
const screwTop = (press) => {
  const bottom = BOSS.z0 - STROKE * press;
  return k.cylinder(XP, 0, SCREW_R, SLEEVE.z1, bottom - SLEEVE.z1, P, 20);
};
const threadsTop = (press) => {
  const shift = STROKE * press;
  const out = [];
  for (let z = FLANGE_Z + 3.2; z < BOSS.z0; z += 2.4) {
    const zz = z - shift;
    if (zz > SLEEVE.z1 + 0.4 && zz < BOSS.z0 - shift - 0.4) out.push(k.sideArc(XP, 0, SCREW_R, zz, P, 14));
  }
  return out.join("");
};
const barRing = (phi) => {
  const c = Math.cos(phi), s = Math.sin(phi);
  const pt = (u, v) => [XP + u * c - v * s, u * s + v * c];
  return [pt(-BAR.reach, -BAR.half), pt(BAR.reach, -BAR.half), pt(BAR.reach, BAR.half), pt(-BAR.reach, BAR.half)];
};
const barAt = (phi, press) => k.extrude(barRing(phi), BAR.z0 - STROKE * press, BAR.h, P);

function weightMarkup(name, handle) {
  const out = [];
  out.push(S(cyl(0, 0, WEIGHT.r, WEIGHT.z0, WEIGHT.h, 32, 0.5), { tone: "mid", inner: L(k.sideArc(0, 0, WEIGHT.r, WEIGHT.z0 + WEIGHT.h / 2, P, 24), { tone: "faint" }) }));
  if (handle) {
    out.push(S(cyl(0, 0, 1.3, WEIGHT.z0 + WEIGHT.h, 7, 16), { tone: "mid", crease: "none" }));
    out.push(S(cyl(0, 0, 2.2, WEIGHT.z0 + WEIGHT.h + 7, 2.6, 20, 0.3), { tone: "mid" }));
  } else {
    out.push(L(k.ring(0, 0, WEIGHT.r - 1.4, WEIGHT.z0 + WEIGHT.h, P, 24), { tone: "faint" }));
    out.push(D([at([0, 0, WEIGHT.z0 + WEIGHT.h])], { size: 0.5 }));
  }
  return `<g data-part="${name}">${out.join("")}</g>`;
}
const weightOffset = (phi, sign, press) => [XP + sign * WEIGHT.at * Math.cos(phi), sign * WEIGHT.at * Math.sin(phi), -STROKE * press];

// ---------- assemble ----------
const restNewest = 7;
const restSlots = Array.from({ length: SLOTS }, (_, j) => (j === 0 ? -1 : (((restNewest - j) % ANSWER) + ANSWER) % ANSWER));
const viewDepth = (x, y) => k.depthOf([x, y, 0], P);
const weightsAt = (phi, press) => {
  const a = weightOffset(phi, 1, press), b = weightOffset(phi, -1, press);
  const centre = viewDepth(XP, 0);
  return { a, b, aFront: viewDepth(a[0], a[1]) > centre };
};
const W0 = weightsAt(PHI0, 0);
const weightA = `<g data-part="weight-a-pos" transform="${k.translateAlong(P, W0.a)}">${weightMarkup("weight-a", true)}</g>`;
const weightB = `<g data-part="weight-b-pos" transform="${k.translateAlong(P, W0.b)}">${weightMarkup("weight-b", false)}</g>`;

const headHalo = `<path class="iso-halo" data-part="head-halo" d="${k.haloOf(k.insetPlan(HEAD, 1), ZR, 0.1, P)}" style="filter:blur(3px);opacity:0.35"/>`;

const body = [
  base(),
  column(),
  infeed(),
  bed(),
  ribbon(),
  slotsMarkup(restSlots, restNewest),
  infeedFront(),
  delivery(),
  deliveryFront(),
  knob(),
  galley(),
  `<path data-part="feed-pointer" class="iso-line" data-tone="mid" data-free="start" d="${pointerAt(0)}" style="stroke-width:0.9"/>`,
  arm(),
  headHalo,
  `<g data-part="head">${headGroup()}</g>`,
  sleeve(),
  `<g data-part="weights-back">${W0.aFront ? weightB : weightA}</g>`,
  liveSolid(screwTop(0), { tone: "mid", part: "screw-top", crease: "none" }),
  `<path data-part="screw-threads" class="iso-line" data-tone="lo" d="${threadsTop(0) || "M0 0"}"/>`,
  `<g data-part="boss">${S(cyl(XP, 0, BOSS.r, BOSS.z0, BOSS.h, 32, 0.5), { tone: "mid" })}${L(k.knurl(XP, 0, BOSS.r, BOSS.z0, BOSS.z0 + BOSS.h, 28, P), { tone: "lo" })}</g>`,
  liveSolid(barAt(PHI0, 0), { tone: "mid", part: "bar" }),
  `<g data-part="weights-front">${W0.aFront ? weightA : weightB}</g>`,
];

const LABEL =
  "A small fly press prints a paper ribbon one line per stroke. Fan-folded paper feeds from a tray, passes under a platen that carries a chase of set type, and runs out along a ruled bed into a delivery tray. Each turn of the fly bar drops the platen once and prints only the newest line; every line already printed is kept as it is.";

const svg = k.figureSvg({ width: W, height: H, label: LABEL, body });
writeFileSync(join(SRC, "samemark.svg"), svg + "\n");

// ---------- live behaviour ----------
const DATA = {
  P,
  XP,
  ZR,
  PITCH,
  HOLE_PITCH,
  STROKE,
  SWING,
  PHI0,
  ANSWER,
  SLOTS,
  NOSE,
  CYCLE,
  CYCLE_T,
  SCREW_R,
  SLEEVE_TOP: SLEEVE.z1,
  BOSS_Z: BOSS.z0,
  BAR: BAR,
  WEIGHT_AT: WEIGHT.at,
  FLANGE_Z,
  KNOB,
  restNewest,
  restSlots,
  marks: LINE_MARKS,
};

const LIVE = `
const SM = ${JSON.stringify(DATA)};
function mount(root, { mode = "tour" } = {}) {
  const P = SM.P;
  const svg = root.querySelector("svg");
  const part = (name) => svg.querySelector('[data-part="' + name + '"]');
  const head = part("head"), halo = part("head-halo"), boss = part("boss"), bar = part("bar");
  const screw = part("screw-top"), threads = part("screw-threads"), pointer = part("feed-pointer");
  const holes = part("holes"), back = part("weights-back"), front = part("weights-front");
  const wa = part("weight-a-pos"), wb = part("weight-b-pos");
  const slots = [...svg.querySelectorAll('[data-part="line"]')].sort((a, b) => a.dataset.slot - b.dataset.slot);
  const plate = root.closest(".iso-plate") || root;
  const readout = plate.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const C = SM.CYCLE;
  const phaseAt = (c) => {
    const t1 = C.down, t2 = t1 + C.dwell, t3 = t2 + C.up, t4 = t3 + C.feed;
    const press = c < t1 ? ease(c / C.down) : c < t2 ? 1 : c < t3 ? 1 - ease((c - t2) / C.up) : 0;
    const advance = c < t3 ? 0 : c < t4 ? ease((c - t3) / C.feed) : 1;
    return { press, inked: c >= t1, advance };
  };
  const fadeAt = (x) => { const s = Math.max(0, Math.min(1, (SM.NOSE - 2 - x) / 9)); return s * s * (3 - 2 * s); };
  const lineOf = [...SM.restSlots];
  let newest = SM.restNewest, fed = 0, inked = false;
  let c = null, queued = 0, frame = 0, last = 0, visible = false, hovering = false, touring = mode === "tour", idle = 0;
  const KEYS = ["fill", "s0", "s1", "s2", "s3", "top", "crease", "outline"];
  const setSolid = (g, p) => KEYS.forEach((key) => {
    const node = g.querySelector('[data-k="' + key + '"]');
    const d = key[0] === "s" && key.length === 2 ? p.shades[+key[1]] : p[key];
    node.setAttribute("d", d || "M0 0");
  });
  const fill = (j) => {
    const g = slots[j], index = lineOf[j];
    if (index < 0) { g.style.display = "none"; return; }
    g.style.display = "";
    const mark = SM.marks[index];
    const path = g.firstElementChild;
    path.setAttribute("d", mark.d);
      };
  const say = (text) => { if (readout && readout.textContent !== text) readout.textContent = text; };
  function draw(ph) {
    const press = ph.press, drop = -SM.STROKE * press, phi = SM.PHI0 + SM.SWING * press;
    head.setAttribute("transform", translateAlong(P, [0, 0, drop]));
    halo.style.opacity = (0.3 + 0.45 * press).toFixed(3);
    boss.setAttribute("transform", translateAlong(P, [0, 0, drop]));
    setSolid(screw, cylinder(SM.XP, 0, SM.SCREW_R, SM.SLEEVE_TOP, SM.BOSS_Z + drop - SM.SLEEVE_TOP, P, 20));
    let arcs = "";
    for (let z = SM.FLANGE_Z + 3.2; z < SM.BOSS_Z; z += 2.4) {
      const zz = z + drop;
      if (zz > SM.SLEEVE_TOP + 0.4 && zz < SM.BOSS_Z + drop - 0.4) arcs += sideArc(SM.XP, 0, SM.SCREW_R, zz, P, 14);
    }
    threads.setAttribute("d", arcs || "M0 0");
    const cs = Math.cos(phi), sn = Math.sin(phi);
    const pt = (u, v) => [SM.XP + u * cs - v * sn, u * sn + v * cs];
    const B = SM.BAR;
    setSolid(bar, extrude([pt(-B.reach, -B.half), pt(B.reach, -B.half), pt(B.reach, B.half), pt(-B.reach, B.half)], B.z0 + drop, B.h, P));
    const a = [SM.XP + SM.WEIGHT_AT * cs, SM.WEIGHT_AT * sn, drop], b = [SM.XP - SM.WEIGHT_AT * cs, -SM.WEIGHT_AT * sn, drop];
    wa.setAttribute("transform", translateAlong(P, a));
    wb.setAttribute("transform", translateAlong(P, b));
    const aFront = depthOf([a[0], a[1], 0], P) > depthOf([SM.XP, 0, 0], P);
    const wantFront = aFront ? wa : wb, wantBack = aFront ? wb : wa;
    if (wantFront.parentNode !== front) { front.appendChild(wantFront); back.appendChild(wantBack); }
    const shift = SM.PITCH * ph.advance;
    for (let j = 0; j < SM.SLOTS; j++) {
      const g = slots[j], x = SM.XP + SM.PITCH * j + shift;
      g.setAttribute("transform", translateAlong(P, [SM.PITCH * j + shift, 0, 0]));
      const alpha = fadeAt(x);
      if (alpha < 1) g.setAttribute("opacity", alpha.toFixed(3)); else g.removeAttribute("opacity");
      const lit = lineOf[j] >= 0 && lineOf[j] === newest - 1 && (inked ? j === 0 : j === 1);
      const tone = lit ? "lit" : "mid";
      const path = g.firstElementChild;
      if (path.getAttribute("data-tone") !== tone) { path.setAttribute("data-tone", tone); path.style.strokeWidth = lit ? "1.05" : "0.75"; }
    }
    const hx = shift % SM.HOLE_PITCH;
    holes.setAttribute("transform", translateAlong(P, [hx, 0, 0]));
    const turn = (fed + ph.advance) / 8;
    const ang = turn * Math.PI * 2, K = SM.KNOB;
    pointer.setAttribute("d", lineOnTop([K.x - Math.sin(ang) * 1.1, K.y + Math.cos(ang) * 1.1], [K.x + Math.sin(ang) * (K.r - 1.2), K.y - Math.cos(ang) * (K.r - 1.2)], K.z + K.h, P));
    say("line " + newest + " of " + SM.ANSWER + " · " + (newest - 1) + " kept, 1 new");
  }
  function impress() {
    newest = (newest % SM.ANSWER) + 1;
    lineOf[0] = newest - 1;
    inked = true;
    fill(0);
  }
  function finish() {
    for (let j = SM.SLOTS - 1; j > 0; j--) lineOf[j] = lineOf[j - 1];
    lineOf[0] = -1;
    inked = false;
    fed += 1;
    for (let j = 0; j < SM.SLOTS; j++) fill(j);
  }
  const REST = { press: 0, inked: false, advance: 0 };
  function wants() { return (touring && !still.matches) || (mode === "hover" && hovering) || queued > 0; }
  function tick(now) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (c === null && wants()) { c = 0; if (queued > 0) queued--; }
    if (c !== null) {
      c += dt;
      const ph = phaseAt(c);
      if (ph.inked && !inked) impress();
      if (c >= SM.CYCLE_T) { finish(); c = null; draw(REST); }
      else draw(ph);
    }
    if (visible && (c !== null || wants())) frame = requestAnimationFrame(tick);
  }
  const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
  const instant = () => { impress(); finish(); draw(REST); };
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run(); else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: "120px 0px" });
  io.observe(root);
  const pause = () => {
    if (mode !== "tour") return;
    touring = false;
    clearTimeout(idle);
    idle = setTimeout(() => { touring = true; run(); }, 3600);
  };
  const press = () => { if (still.matches) { instant(); return; } pause(); queued = Math.min(queued + 1, 2); run(); };
  const onEnter = () => { hovering = true; run(); };
  const onLeave = () => { hovering = false; };
  const onDown = (event) => { if (event.button === 0 || event.pointerType !== "mouse") press(); };
  const onKey = (event) => {
    if (event.key === " " || event.key === "Enter" || event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); press(); }
    if (event.key === "Escape") { pause(); }
  };
  if (mode === "hover") {
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
  } else {
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("keydown", onKey);
  }
  const onMotion = () => { if (still.matches) { if (frame) cancelAnimationFrame(frame); frame = 0; c = null; draw(REST); } else run(); };
  still.addEventListener("change", onMotion);
  draw(REST);
  return {
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(idle);
      io.disconnect();
      still.removeEventListener("change", onMotion);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("keydown", onKey);
    },
  };
}
`;

const IMPORTS = ["cylinder", "depthOf", "extrude", "lineOnTop", "sideArc", "translateAlong"];
const liveModule =
  `// samemark figure, live behaviour. Generated by www/figures/samemark/build.mjs.\n` +
  `import { ${IMPORTS.join(", ")} } from "../../vendor/anatomy/kit/iso-kit.mjs";\n` +
  LIVE.replace("function mount(", "export function mount(");
writeFileSync(join(SRC, "samemark.live.js"), liveModule);

// ---------- preview pages ----------
const card = k.plateHtml({
  fig: "Fig",
  title: "samemark",
  hint: "Click to print a line",
  readout: readoutOf(restNewest),
  keys: [
    { mark: "lit", label: "Newest line: the only new work in a push" },
    { mark: "raised", label: "Platen and chase: one stroke prints one line" },
  ],
  caption: `Each stroke of the press sets and prints only the newest line, and every line already printed stays as it is, the way samemark/stream parses only the unfinished tail of a chat answer: ${METRICS.streaming} less main-thread time. Every impression matches the type: the same mdast as remark-parse, ${METRICS.endToEnd} faster end to end.`,
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Fly press printing a ribbon. Press Space or Enter to print the next line.">${svg}</div>`,
});
const PAGE_CSS = `<style>.iso-stage{touch-action:pan-y;outline:none}.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}</style>`;
const script = kitScript() + LIVE + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
for (const theme of ["light", "dark"]) {
  const file = theme === "light" ? "preview-light.html" : "preview.html";
  writeFileSync(join(HERE, file), k.pageHtml({ title: "samemark", theme, body: PAGE_CSS + card, script, width: 560 }));
}
console.log("wrote samemark.svg, samemark.live.js, preview-light.html, preview.html");
