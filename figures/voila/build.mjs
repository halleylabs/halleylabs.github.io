// voila: a cine camera on a short rail dolly, aimed at a small display on a stand, with a
// compact loudspeaker beside it for the narration. The dolly tracks the cursor along the
// rail and the lens barrel zooms in (the auto-zoom); the speaker cone moves while it narrates.
//
// node build.mjs            writes ../../src/figures/voila.svg, ../../src/figures/voila.live.js,
//                           preview-light.html and preview.html (dark)
// node build.mjs --audit    proves the geometry at rest and along the whole dolly travel
// node build.mjs --audit --zoom   the same with the lens fully zoomed in

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import * as A from "../../vendor/anatomy/kit/audit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import { LANGS, PAGE, PHASES, REST_AT, REST_READOUT, SCREEN, STEPS, STEP_SECONDS, readoutOf } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src", "figures");
mkdirSync(SRC, { recursive: true });
const ZOOMED = process.argv.includes("--zoom");

const WIDTH = 480;
const HEIGHT = 320;
const AZIMUTH = 52;

// ---------- world plan ----------
const PLATE = { x: -120, y: -66, w: 240, d: 136, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// display on its stand, face toward +y
const FOOT = { x: -26, y: -62, w: 52, d: 24, r: 5 };
const FOOT_TOP = 3;
const NECK = { x: -5, y: -57, w: 10, d: 6, r: 1.5 };
const CASE = { x: -42, y: -51, w: 84, d: 7, r: 2 };
const CASE_Z = 18;
const CASE_TOP = 70;
const FACE = CASE.y + CASE.d; // y of the screen face
const SCREEN_X = -SCREEN.w / 2; // left edge of the glass
const SCREEN_TOP = 67.5; // top edge of the glass

// loudspeaker, face toward +y
const SPK = { x: 54, y: -56, w: 26, d: 22, r: 3 };
const SPK_Z = 2;
const SPK_TOP = 44;
const SPK_FACE = SPK.y + SPK.d;
const CONE = [SPK.x + SPK.w / 2, 21];
const TWEETER = [SPK.x + SPK.w / 2, 36.5];

// rails along x
const RAILS = [14, 34];
const RAIL_X0 = -60;
const RAIL_X1 = 60;
const RAIL_Z = 5;
const RAIL_TOP = 8;
const TIES = [-54, -18, 18, 54];

// the dolly, built at home (share 0) and moved by share * TRAVEL along x
const TRAVEL = 64;
const HOME = -32;
const REST_SHARE = 0.5;
const WHEEL_R = 3.2;
const WHEEL_Z = RAIL_TOP + WHEEL_R;
const DECK_Z = WHEEL_Z + WHEEL_R;
const DECK_TOP = DECK_Z + 3;
const BODY_Z = DECK_TOP + 10;
const BODY_TOP = BODY_Z + 19;
const LENS_Z = BODY_Z + 10;
const BODY_FRONT = 12;
const BODY_BACK = 40;
const STROKE = 8;

const SPRING = { stagger: 0.035, stiffness: 46, damping: 13.5, substeps: 4 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [CASE.x, CASE.y, CASE_TOP],
    [CASE.x + CASE.w, CASE.y, CASE_TOP],
    [HOME, 27, BODY_TOP + 17],
    [HOME + TRAVEL, 27, BODY_TOP + 17],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---------- recorder and drawing helpers ----------
const R = A.recorder(P, { order: ["dolly"], spring: SPRING });
const record = R.solid;
const MOVE = [TRAVEL, 0, 0];
function put(name, ref, svg, shapes, { bias = 0, dolly = false, part } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: dolly ? "dolly" : "bench", move: dolly ? MOVE : [0, 0, 0], part });
}
function slab(name, plan, z, h, style = {}, { steps = 4, bevel = 0, extra = "", inner = "", bias = 0, dolly = false, part } = {}) {
  const shape = record(A.slab(plan, z, h, { name }, steps));
  return put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, dolly, part });
}
function cyl(name, cx, cy, r, z, h, style = {}, { steps = 28, bevel = 0, extra = "", inner = "", bias = 0, dolly = false } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, h, { name }));
  return put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, dolly });
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, dolly = false, owner, bevel = 0, part } = {}) {
  const shape = record(A.solid(F, profile, { name, owner }));
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  return put(name, G.add3(F.o, G.mul3(F.a, mid)), S(G.solidOf(profile, F, P, { bevel }), { tone: "mid", ...style, inner }) + extra, [shape], { bias, dolly, part });
}
const disc = (name, F, s0, s1, r, style, options) => turned(name, F, [[s0, r], [s1, r]], style, options);
const rr = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// ---------- base (drawn behind everything, not sorted) ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "lo" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));
  // label plate, front left
  const label = { x: -100, y: 44, w: 46, d: 13, r: 2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([label.x + 7, label.y + 4 + row * 2.5], [label.x + (row === 1 ? 26 : 36), label.y + 4 + row * 2.5], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + 3.4, label.y + label.d / 2, 0.8]), at([label.x + label.w - 3.4, label.y + label.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------- the display ----------
function display() {
  slab("stand.foot", FOOT, 0, FOOT_TOP, {}, { bevel: 0.8, extra: L(k.planOutline(k.insetPlan(FOOT, 3), FOOT_TOP, P, 4), { tone: "faint" }) });
  slab("stand.neck", NECK, FOOT_TOP, CASE_TOP - 16 - FOOT_TOP, {}, { steps: 3, bevel: 0.4 });
  // the screen, drawn in the plane of the face
  const m = k.sideMatrix([SCREEN_X, FACE], SCREEN_TOP, P, "left");
  const box = (b, cls, part) => `<rect${part ? ` data-part="${part}"` : ""} class="vo-${cls}" x="${b.u}" y="${b.v}" width="${b.w}" height="${b.h}" rx="${b.r ?? 0}"/>`;
  const page = [
    `<rect class="vo-glass" x="0" y="0" width="${SCREEN.w}" height="${SCREEN.h}"/>`,
    box(PAGE.bar, "bar"),
    [2.4, 4.6, 6.8].map((u) => `<circle class="vo-dot" cx="${u}" cy="2.2" r="0.7"/>`).join(""),
    box(PAGE.url, "pill"),
    box(PAGE.logo, "ink"),
    PAGE.links.map((b) => box(b, "soft")).join(""),
    box(PAGE.cta, "ink", "page-cta"),
    PAGE.heading.map((b, i) => box(b, "ink", `page-heading.${i}`)).join(""),
    PAGE.copy.map((b) => box(b, "soft")).join(""),
    box(PAGE.button, "ink", "page-button"),
    box(PAGE.hero, "panel", "page-hero"),
    `<path class="vo-rule" d="M${PAGE.hero.u + 4} ${PAGE.hero.v + 15}L${PAGE.hero.u + 10} ${PAGE.hero.v + 9}L${PAGE.hero.u + 14} ${PAGE.hero.v + 12.5}L${PAGE.hero.u + 22} ${PAGE.hero.v + 5}"/>`,
    `<circle class="vo-dot" cx="${PAGE.hero.u + 21}" cy="${PAGE.hero.v + 4.4}" r="1.6"/>`,
    PAGE.cards.map((b, i) => box(b, "panel", `page-cards.${i}`)).join(""),
    `<g data-part="cursor" transform="translate(${REST_AT.u} ${REST_AT.v})"><circle data-part="click" class="vo-click" r="3.2" opacity="0"/><path class="vo-cursor" d="M0 0L0 5.2L1.3 4L2.3 6.1L3.1 5.7L2.1 3.7L3.8 3.7Z"/></g>`,
  ].join("");
  const glass = `<g transform="${m}"><clipPath id="vo-screen"><rect x="0" y="0" width="${SCREEN.w}" height="${SCREEN.h}"/></clipPath><g clip-path="url(#vo-screen)">${page}</g><rect class="vo-bezel" x="0" y="0" width="${SCREEN.w}" height="${SCREEN.h}"/></g>`;
  const chin = D([at([CASE.x + CASE.w - 5, FACE, CASE_Z + 1.6]), at([CASE.x + CASE.w - 8, FACE, CASE_Z + 1.6])], { size: 0.45, tone: "mid" });
  const seam = L(k.sideSeam(CASE, CASE_Z + 3.2, P, 3), { tone: "faint" });
  slab("stand.case", CASE, CASE_Z, CASE_TOP - CASE_Z, {}, { steps: 3, bevel: 0.6, inner: seam, extra: glass + chin, part: "display" });
}

// ---------- the loudspeaker ----------
function speaker() {
  const plinth = { x: SPK.x - 1, y: SPK.y - 1, w: SPK.w + 2, d: SPK.d + 2, r: SPK.r + 1 };
  slab("stand.spk.plinth", plinth, 0, SPK_Z, {}, { bevel: 0.4 });
  const m = k.sideMatrix([CONE[0], SPK_FACE], CONE[1], P, "left");
  const t = k.sideMatrix([TWEETER[0], SPK_FACE], TWEETER[1], P, "left");
  const cone = `<g transform="${m}"><circle class="vo-surround" r="9.6"/><g data-part="cone"><circle class="vo-cone" r="8.2"/><circle class="vo-ring" r="5.6"/><circle class="vo-ring" r="3.8"/><circle class="vo-cap" r="2.4"/></g></g>`;
  const tweeter = `<g transform="${t}"><circle class="vo-surround" r="3.4"/><circle class="vo-cap" r="1.6"/></g>`;
  const slot = path3([[SPK.x + 6, SPK_FACE, 6.4], [SPK.x + SPK.w - 6, SPK_FACE, 6.4], [SPK.x + SPK.w - 6, SPK_FACE, 8.4], [SPK.x + 6, SPK_FACE, 8.4]], true);
  const screws = D(
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => at([CONE[0] + a * 10.6, SPK_FACE, CONE[1] + b * 10.6])),
    { size: 0.42 },
  );
  const seam = L(k.sideSeam(SPK, SPK_TOP - 3, P, 4), { tone: "faint" });
  slab("stand.spk", SPK, SPK_Z, SPK_TOP - SPK_Z, {}, { steps: 4, bevel: 0.8, inner: seam, extra: cone + tweeter + L(slot, { tone: "lo" }) + screws, part: "speaker" });
}

// ---------- rails ----------
function rails() {
  for (const x of TIES) {
    slab(`stand.tie${x}`, { x: x - 4, y: 8, w: 8, d: 32, r: 1.5 }, 0, RAIL_Z, {}, { steps: 3, bevel: 0.5 });
  }
  RAILS.forEach((y, index) => {
    const plan = { x: RAIL_X0, y: y - 2, w: RAIL_X1 - RAIL_X0, d: 4, r: 1 };
    const screws = D(TIES.map((x) => at([x, y, RAIL_TOP])), { size: 0.4 });
    slab(`stand.rail${index}`, plan, RAIL_Z, RAIL_TOP - RAIL_Z, {}, { steps: 3, bevel: 0.4, extra: screws });
    for (const x of [RAIL_X0, RAIL_X1 - 4]) slab(`stand.stop${index}.${x}`, { x, y: y - 3, w: 4, d: 6, r: 1 }, RAIL_TOP, 4, {}, { steps: 3, bevel: 0.4 });
  });
  // a ruler strip on the front of the bench, under the travel
  const strip = { x: HOME - 16, y: RAILS[1] + 9, w: TRAVEL + 32, d: 6, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y, 0.6, [1.8, 3.4], P);
  slab("stand.ruler", strip, 0, 0.6, { tone: "lo", crease: "none" }, { steps: 3, extra: L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) });
}

// ---------- the finished film: two cans of it on the bench ----------
function cans() {
  const cans = [[86, 42, 0, 14], [90, 39, 4.2, 12.4]];
  cans.forEach(([x, y, z, r], index) => {
    const name = `stand.can${index}`;
    cyl(`${name}.body`, x, y, r - 0.5, z, 2.8, {}, { steps: 56, extra: L(k.sideArc(x, y, r - 0.5, z + 1.2, P, 32), { tone: "faint" }) });
    const lid = L(k.ring(x, y, r - 2.2, z + 4.2, P, 56), { tone: "faint" }) + L(k.ring(x, y, 2.6, z + 4.2, P, 24), { tone: "lo" }) + D([0.15, 0.48, 0.81].map((t) => at([x + Math.sin(t * 6.283) * (r - 4.4), y - Math.cos(t * 6.283) * (r - 4.4), z + 4.2])), { size: 0.5 });
    cyl(`${name}.lid`, x, y, r, z + 2.8, 1.4, {}, { steps: 56, bevel: 0.5, extra: lid });
  });
}

// ---------- the dolly and the camera (at home) ----------
const CX = HOME;
const LENS_F = G.frameOf([CX, BODY_FRONT, LENS_Z], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
function dolly() {
  const opt = { dolly: true };
  // wheels on the rails, axles along y
  for (const y of RAILS) {
    for (const dx of [-10, 10]) {
      const F = G.frameAlong([CX + dx, y, WHEEL_Z], [0, 1, 0]);
      disc(`dolly.wheel${y}.${dx}`, F, -1.8, 1.8, WHEEL_R, {}, { ...opt, extra: L(G.circleOf(F, 1.8, 1.1, P, 16), { tone: "lo" }) });
    }
  }
  // bogie plates outside the wheels
  for (const y of RAILS) {
    const side = y === RAILS[1] ? 1 : -1;
    slab(`dolly.bogie${y}`, { x: CX - 15, y: y + side * 2.2 - (side < 0 ? 1.4 : 0), w: 30, d: 1.4, r: 0.5 }, WHEEL_Z - 1.2, DECK_Z - WHEEL_Z + 1.2, {}, { ...opt, steps: 2, extra: D([-10, 10].map((dx) => at([CX + dx, y + side * 3.6, WHEEL_Z])), { size: 0.55 }) });
  }
  const deck = { x: CX - 17, y: 8.6, w: 34, d: 30.8, r: 3 };
  slab("dolly.deck", deck, DECK_Z, DECK_TOP - DECK_Z, {}, { ...opt, bevel: 0.8, extra: L(k.planOutline(k.insetPlan(deck, 2.6), DECK_TOP, P, 4), { tone: "faint" }) + D(k.corners(deck, 4.4).map(([x, y]) => at([x, y, DECK_TOP])), { size: 0.45 }) });
  // brake knob on the front corner
  cyl("dolly.brake", CX + 12.5, 34.5, 2.2, DECK_TOP, 3.6, {}, { ...opt, steps: 18, extra: L(k.knurl(CX + 12.5, 34.5, 2.2, DECK_TOP, DECK_TOP + 3.6, 16, P), { tone: "lo" }) });
  // pan and tilt head
  cyl("dolly.pan", CX, 26, 7.5, DECK_TOP, 2.4, {}, { ...opt, steps: 40, bevel: 0.4, extra: L(k.radialTicks(CX, 26, 7.2, 24, 6, DECK_TOP + 2.4, [0.9, 1.8], P).minor, { tone: "lo" }) + L(k.ring(CX, 26, 7.2, DECK_TOP + 2.4, P, 40), { tone: "lo" }) });
  cyl("dolly.head", CX, 26, 5.4, DECK_TOP + 2.4, 3.6, {}, { ...opt, steps: 32 });
  slab("dolly.tilt", { x: CX - 6.5, y: 19, w: 13, d: 14, r: 1.6 }, DECK_TOP + 6, BODY_Z - DECK_TOP - 6, {}, { ...opt, steps: 3, bevel: 0.5 });
  // the camera body
  const body = { x: CX - 10, y: BODY_FRONT, w: 20, d: BODY_BACK - BODY_FRONT, r: 2.5 };
  const window = path3([[CX + 10, 30, BODY_Z + 13.5], [CX + 10, 36, BODY_Z + 13.5], [CX + 10, 36, BODY_Z + 16], [CX + 10, 30, BODY_Z + 16]], true);
  const door = path3([[CX + 10, 15, BODY_Z + 3], [CX + 10, 27, BODY_Z + 3], [CX + 10, 27, BODY_Z + 16], [CX + 10, 15, BODY_Z + 16]], true);
  slab("dolly.body", body, BODY_Z, BODY_TOP - BODY_Z, { tone: "mid" }, {
    ...opt,
    bevel: 0.8,
    inner: L(k.sideSeam(body, BODY_Z + 2.4, P, 4), { tone: "faint" }),
    extra: L(window, { tone: "lo" }) + L(door, { tone: "faint" }) + D([at([CX + 10, 16.5, BODY_Z + 4.5]), at([CX + 10, 25.5, BODY_Z + 4.5]), at([CX + 10, 16.5, BODY_Z + 14.5]), at([CX + 10, 25.5, BODY_Z + 14.5])], { size: 0.4 }) + D(k.corners(body, 3).map(([x, y]) => at([x, y, BODY_TOP])), { size: 0.42 }),
  });
  // crank on the side
  const crankF = G.frameOf([CX + 10, 33, BODY_Z + 7], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  disc("dolly.crank.hub", crankF, 0, 1.4, 2.6, {}, { ...opt, extra: L(G.circleOf(crankF, 1.4, 1.2, P, 16), { tone: "lo" }) });
  slab("dolly.crank.arm", { x: CX + 11.4, y: 32.2, w: 0.9, d: 1.6, r: 0.4 }, BODY_Z + 2.6, 4.4, {}, { ...opt, steps: 2 });
  disc("dolly.crank.knob", G.frameOf([CX + 12.3, 33, BODY_Z + 3.4], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 0, 2.6, 1.1, {}, { ...opt });
  // eyepiece at the back
  const eyeF = G.frameOf([CX + 5, BODY_BACK, LENS_Z + 4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  turned("dolly.eyepiece", eyeF, [[0, 2.2], [3.4, 2.2], [3.4, 3], [5.6, 3]], {}, { ...opt, extra: L(G.circleOf(eyeF, 5.6, 2, P, 20), { tone: "lo" }) });
  // magazine: a saddle and two reels, axles along x
  slab("dolly.saddle", { x: CX - 3.2, y: 16, w: 6.4, d: 22, r: 1.2 }, BODY_TOP, 2, {}, { ...opt, steps: 3 });
  for (const y of [19.6, 35]) {
    const F = G.frameOf([CX, y, BODY_TOP + 2 + 7.6], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const face = L(G.circleOf(F, 3, 6.2, P, 40), { tone: "faint" }) + L(G.circleOf(F, 3, 1.8, P, 18), { tone: "lo" }) + D(G.dotsOf(F, 3, 4.2, 3, P, { all: true, phase: 0.5 }), { size: 0.42 });
    disc(`dolly.reel${y}`, F, -3, 3, 7.6, {}, { ...opt, extra: face });
  }
}

// ---------- the lens: mount, focus barrel, and the zoom barrel that slides out ----------
function lens() {
  const opt = { dolly: true, owner: "lens" };
  const ribs = G.ribsOf(LENS_F, 4.4, 10.2, 6.2, 44, P, { fade: [0.1, 0.55], seams: true });
  turned("dolly.lens.mount", LENS_F, [[0, 7.4], [1.6, 7.4]], {}, { ...opt, bevel: 0 });
  turned("dolly.lens.outer", LENS_F, [[1.6, 6.2], [12, 6.2]], {}, { ...opt, extra: k.fadedSvg(ribs, { tone: "lo" }) });
  const out = ZOOMED ? STROKE : 0;
  const zoomF = G.frameOf(G.add3(LENS_F.o, G.mul3(LENS_F.a, out)), LENS_F.a, LENS_F.u, LENS_F.v);
  const front = L(G.arcOf(zoomF, 13.4, 4.8, P), { tone: "faint" });
  turned("dolly.lens.zoom", zoomF, [[2, 4.8], [13.4, 4.8], [13.4, 5.4], [15, 5.4]], { tone: "hi" }, { ...opt, inner: front, part: "lens" });
}

display();
speaker();
rails();
cans();
dolly();
lens();

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
A.auditOrExit(R, P, {});

// does the painter's order change along the travel?
const orderAt = (share) => [...R.items].sort((a, b) => (a.key + G.dot3(a.move, V) * share) - (b.key + G.dot3(b.move, V) * share)).map((item) => item.name).join("|");
const STABLE = [0, 0.25, 0.5, 0.75, 1].every((share) => orderAt(share) === orderAt(0));

if (!ZOOMED) {
  const restMove = k.translateAlong(P, [TRAVEL * REST_SHARE, 0, 0]);
  const items = R.items
    .map((item) => {
      const lift = G.dot3(item.move, V);
      const dolly = item.piece === "dolly";
      const attrs = `${dolly ? ` data-dolly="" transform="${restMove}"` : ""} data-k="${item.key.toFixed(4)}" data-l="${lift.toFixed(4)}"${item.part || dolly ? ` data-part="${item.part || item.name.replace(/[^a-z0-9.]+/gi, "-")}"` : ""}`;
      return `<g class="vo-item"${attrs}>${item.svg}</g>`;
    })
    .join("");

  const STYLE = `<style>
.vo-glass{fill:var(--anatomy-shade-1);stroke:none}
.vo-bezel{fill:none;stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight)}
.vo-bar{fill:var(--anatomy-shade-0);stroke:none}
.vo-pill{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:.4}
.vo-dot{fill:var(--anatomy-lo);stroke:none}
.vo-ink{fill:var(--anatomy-lo);stroke:none}
.vo-ink[data-on]{fill:var(--anatomy-mid)}
.vo-soft{fill:var(--anatomy-faint);stroke:none}
.vo-panel{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:.4}
.vo-panel[data-on]{stroke:var(--anatomy-hi);stroke-width:.7}
.vo-rule{fill:none;stroke:var(--anatomy-mid);stroke-width:.5;stroke-linejoin:round}
.vo-cursor{fill:var(--anatomy-hi);stroke:var(--anatomy-paper);stroke-width:.35;stroke-linejoin:round}
.vo-click{fill:none;stroke:var(--anatomy-hi);stroke-width:.4}
.vo-surround{fill:var(--anatomy-shade-1);stroke:var(--anatomy-mid);stroke-width:.5}
.vo-cone{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.4}
.vo-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.35}
.vo-cap{fill:var(--anatomy-shade-2);stroke:var(--anatomy-mid);stroke-width:.4}
</style>`;

  const LABEL =
    "A cine camera on a short rail dolly, aimed at a small display on a stand, with a compact loudspeaker beside it. The display shows a web page with a cursor. The dolly tracks along the rail to follow the cursor and the lens barrel zooms in on it, then the loudspeaker narrates the step, each step in its own language. Everything stays on the bench: the whole video is made on your machine.";

  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, base(), `<g data-part="items">${items}</g>`] });

  const LIVE_DATA = {
    P,
    TRAVEL,
    HOME,
    REST_SHARE,
    STROKE,
    SCREEN_X,
    SCREEN,
    REST_AT,
    STEPS: STEPS.map((s) => ({ target: s.target, u: s.at.u, v: s.at.v })),
    PHASES,
    STEP_SECONDS,
    READOUTS: STEPS.map((_, i) => ({ track: readoutOf("track", i), zoom: readoutOf("zoom", i), speak: readoutOf("speak", i), out: readoutOf("out", i) })),
    REST_READOUT,
    LANG_COUNT: LANGS.length,
    STABLE,
  };

  const LIVE = `
const V = ${JSON.stringify(LIVE_DATA)};

export function mount(root, { mode = "hover" } = {}) {
  const svg = root.querySelector("svg");
  const q = (part) => svg.querySelector('[data-part="' + part + '"]');
  const layer = q("items");
  const items = [...layer.children].map((el) => ({ el, k: +el.dataset.k, l: +el.dataset.l }));
  const dollies = items.filter((it) => it.el.hasAttribute("data-dolly"));
  const lens = q("lens");
  const cursor = q("cursor");
  const click = q("click");
  const cone = q("cone");
  const targets = Object.fromEntries(V.STEPS.map((s) => [s.target, q("page-" + s.target)]));
  const plate = root.closest(".iso-plate") || root;
  const readout = plate.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const PH = ["track", "zoom", "speak", "out"];
  const phaseAt = (t) => {
    const index = Math.floor(t / V.STEP_SECONDS) % V.STEPS.length;
    let local = t % V.STEP_SECONDS;
    for (const name of PH) { if (local < V.PHASES[name]) return { index, name, share: local / V.PHASES[name] }; local -= V.PHASES[name]; }
    return { index, name: "out", share: 1 };
  };
  const ease = (x) => x * x * (3 - 2 * x);
  const shareFor = (u) => Math.max(0, Math.min(1, (V.SCREEN_X + u - V.HOME) / V.TRAVEL));

  const s = { u: V.REST_AT.u, v: V.REST_AT.v, share: V.REST_SHARE, zoom: 0, voice: 0, clock: 0 };
  let frame = 0, last = 0, visible = false, playing = mode === "tour", idle = 0, order = "", lit = null, said = "";

  function say(text) { if (readout && said !== text) { readout.textContent = text; said = text; } }
  function sortItems() {
    if (V.STABLE) return;
    const sorted = [...items].sort((a, b) => (a.k + a.l * s.share) - (b.k + b.l * s.share));
    const key = sorted.map((it) => it.el.dataset.k).join();
    if (key === order) return;
    order = key;
    const frag = document.createDocumentFragment();
    sorted.forEach((it) => frag.appendChild(it.el));
    layer.appendChild(frag);
  }
  function draw(phase) {
    const move = translateAlong(V.P, [V.TRAVEL * s.share, 0, 0]);
    dollies.forEach((it) => { if (it.el !== lens) it.el.setAttribute("transform", move); });
    lens.setAttribute("transform", translateAlong(V.P, [V.TRAVEL * s.share, -V.STROKE * s.zoom, 0]));
    sortItems();
    cursor.setAttribute("transform", "translate(" + s.u.toFixed(2) + " " + s.v.toFixed(2) + ")");
    const pulse = 1 + 0.03 * s.voice * Math.abs(Math.sin(s.clock * 9.4)) * (0.6 + 0.4 * Math.abs(Math.sin(s.clock * 2.3)));
    cone.setAttribute("transform", "scale(" + pulse.toFixed(4) + ")");
    const on = phase && (phase.name === "zoom" || phase.name === "speak") ? targets[V.STEPS[phase.index].target] : null;
    if (on !== lit) { if (lit) lit.removeAttribute("data-on"); if (on) on.setAttribute("data-on", ""); lit = on; }
    const ring = phase && phase.name === "zoom" ? Math.max(0, 1 - Math.abs(phase.share - 0.45) / 0.35) : 0;
    click.setAttribute("opacity", ring.toFixed(3));
    click.setAttribute("r", (2 + 2.6 * (phase && phase.name === "zoom" ? phase.share : 0)).toFixed(2));
    say(phase ? V.READOUTS[phase.index][phase.name] : V.REST_READOUT);
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    let phase = null, goal = { u: V.REST_AT.u, v: V.REST_AT.v, zoom: 0, voice: 0 };
    if (playing && !calm) {
      s.clock += dt;
      phase = phaseAt(s.clock);
      const step = V.STEPS[phase.index];
      const prev = V.STEPS[(phase.index + V.STEPS.length - 1) % V.STEPS.length];
      if (phase.name === "track") {
        const e = ease(phase.share);
        goal = { u: prev.u + (step.u - prev.u) * e, v: prev.v + (step.v - prev.v) * e, zoom: 0, voice: 0 };
      } else goal = { u: step.u, v: step.v, zoom: phase.name === "out" ? 0 : 1, voice: phase.name === "speak" ? 1 : 0 };
    }
    const f = (x, g, tau) => (calm ? g : x + (g - x) * (1 - Math.exp(-dt / tau)));
    s.u = f(s.u, goal.u, 0.12);
    s.v = f(s.v, goal.v, 0.12);
    s.share = f(s.share, shareFor(s.u), 0.32);
    s.zoom = f(s.zoom, goal.zoom, 0.28);
    s.voice = f(s.voice, goal.voice, 0.15);
    draw(phase);
    const settled = !playing && Math.abs(s.u - goal.u) < 0.01 && Math.abs(s.v - goal.v) < 0.01 && Math.abs(s.share - shareFor(s.u)) < 1e-4 && s.zoom < 1e-3 && s.voice < 1e-3;
    if (settled) { s.u = goal.u; s.v = goal.v; s.share = shareFor(s.u); s.zoom = 0; s.voice = 0; draw(null); }
    frame = visible && !settled ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };

  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: "120px 0px" });
  io.observe(root);

  const off = [];
  const on = (el, type, fn) => { el.addEventListener(type, fn); off.push(() => el.removeEventListener(type, fn)); };
  if (mode === "hover") {
    on(root, "pointerenter", () => { if (still.matches) return; playing = true; s.clock = 0; run(); });
    on(root, "pointerleave", () => { playing = false; run(); });
  } else {
    if (still.matches) playing = false;
    if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "0");
    const jump = (index) => {
      playing = !still.matches;
      s.clock = ((index + V.STEPS.length) % V.STEPS.length) * V.STEP_SECONDS;
      clearTimeout(idle);
      run();
    };
    on(root, "keydown", (event) => {
      const here = Math.floor(s.clock / V.STEP_SECONDS) % V.STEPS.length;
      let to = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") to = here + 1;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") to = here - 1;
      if (event.key === "Home") to = 0;
      if (event.key === "End") to = V.STEPS.length - 1;
      if (to === null) return;
      event.preventDefault();
      jump(to);
      root.setAttribute("aria-valuetext", "step " + (((to % V.STEPS.length) + V.STEPS.length) % V.STEPS.length + 1) + " of " + V.STEPS.length);
    });
    on(root, "pointermove", (event) => {
      const box = svg.getBoundingClientRect();
      const share = Math.max(0, Math.min(0.999, (event.clientX - box.left) / box.width));
      const index = Math.floor(share * V.STEPS.length);
      if (Math.floor(s.clock / V.STEP_SECONDS) % V.STEPS.length !== index) jump(index);
    });
    run();
  }
  draw(null);
  return {
    destroy() {
      off.forEach((fn) => fn());
      io.disconnect();
      clearTimeout(idle);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
`;

  const MODULE = `// Generated by www/figures/voila/build.mjs. Do not edit by hand.\nimport { translateAlong } from "../../vendor/anatomy/kit/iso-kit.mjs";\n${LIVE}`;
  writeFileSync(join(SRC, "voila.svg"), svg);
  writeFileSync(join(SRC, "voila.live.js"), MODULE);

  const inline = `${kitScript()}\n{\n${LIVE.replace("export function mount", "function mount")}\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n}\n`;
  for (const theme of ["light", "dark"]) {
    const body = k.plateHtml({
      fig: "Fig 1",
      title: "voila",
      hint: "Hover to pick a step",
      readout: REST_READOUT,
      keys: [
        { mark: "lit", label: "Zoom barrel: the auto-zoom on the cursor" },
        { mark: "raised", label: "Display, camera and speaker, all on one bench" },
      ],
      caption:
        "A cine camera on a rail dolly films a page on a display. The dolly follows the cursor, the lens zooms in on each click, and the loudspeaker narrates the step with an ~80 MB voice model on the CPU, in any of six languages. Nothing leaves the bench.",
      body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="voila bench: arrow keys step through the tour" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuetext="${REST_READOUT}">${svg}</div>`,
    });
    writeFileSync(join(HERE, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "voila", theme, body, script: inline, width: 560 }));
  }
  console.log(`wrote voila.svg, voila.live.js, preview-light.html, preview.html · ${R.items.length} items · ${R.solids.length} solids · order ${STABLE ? "stable" : "changes"} along the travel · scale ${P.scale.toFixed(3)}`);
}
