// node build.mjs  writes src/figures/faultline.svg, src/figures/faultline.live.js,
// figures/faultline/preview-light.html and preview.html.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { flagSolids } from "./flag.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src", "figures");
const W = 480;
const H = 320;

// ---------- world ----------
const PLATE = { x: -125, y: -75, w: 250, d: 150, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

const TRAY = { x: -100, y: -46, w: 200, d: 92, r: 3 };
const FLOOR = 3;
const WALL_TOP = 12;
const FENCE_TOP = 11;
const PAD_R = 7.5;

const POST_Y = -60;
const POSTS = [-112, 112];
const RAIL = { x: -122, y: -66, w: 244, d: 12, r: 1.5 };
const RAIL_Z = 56;
const RAIL_TOP = 64;
const GUIDE_H = 1.6;

const BEAM_Z = 52;
const BEAM_TOP = 60;
const BEAM_FROM = -46;
const BEAM_TO = 38;
const SLIDE = { hx: 7, hy: 6.5, z0: 46, z1: 70 };

const [HX0, HY0] = M.BAYS[M.HOME];
const ZB0 = M.PAD_TOP;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-122, -66, RAIL_TOP],
    [122, -66, RAIL_TOP],
    [137, -67, 67],
    [-72, -28, 71.5],
    [72, -28, 71.5],
    [72, 28, 71.5],
  ],
  W,
  H,
  { pad: 22, azimuth: 45, elevation: 30 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style = {}) => k.solidSvg(paths, { tone: "mid", ...style });
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points.map(at), style);
const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const depth = ([x, y], z = 0) => k.depthOf([x, y, z], P);
const byDepth = (items) => [...items].sort((a, b) => depth(a.at) - depth(b.at));

// A solid whose paths the live code rewrites: fixed slots, so it only sets `d`.
function liveSolid(paths, { tone = "mid", part, lit = false } = {}) {
  const shade = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${paths.shades[i] || ""}"/>`).join("");
  return `<g class="iso-solid" data-part="${part}"${lit ? ' data-lit=""' : ""}><path class="iso-fill" d="${paths.fill}"/>${shade}<path class="iso-top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="faint" d="${paths.crease || ""}"/><path class="iso-line iso-bevel" data-tone="faint" d="${paths.bevel || ""}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
}

// ---------- base ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of k.corners(PLATE, 20).sort((a, b) => depth(a) - depth(b))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "lo" }));
  }
  out.push(S(slab(PLATE, -PLATE_H, PLATE_H, 8, 1.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => [x, y, 0]), { size: 0.5 }));
  // ruler strip along the front edge
  const strip = { x: -106, y: 55, w: 160, d: 7, r: 1 };
  out.push(S(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([[strip.x + 2, strip.y + 3.5, 0.6], [strip.x + strip.w - 2, strip.y + 3.5, 0.6]], { size: 0.45 }));
  // label plate with three rule lines
  const label = { x: 66, y: 52, w: 42, d: 13, r: 1.6 };
  out.push(S(slab(label, 0, 0.8, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([label.x + 7, label.y + 4 + row * 2.5], [label.x + (row === 1 ? 26 : 34), label.y + 4 + row * 2.5], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([[label.x + 3.5, label.y + label.d / 2, 0.8], [label.x + label.w - 3.5, label.y + label.d / 2, 0.8]], { size: 0.45 }));
  return out.join("");
}

// ---------- gantry: posts, rail, motor ----------
function gantry() {
  const out = [];
  for (const px of POSTS) {
    const foot = { x: px - 8, y: POST_Y - 8, w: 16, d: 16, r: 2 };
    out.push(S(slab(foot, 0, 2, 3, 0.4), { tone: "mid" }));
    out.push(D(k.corners(foot, 2.6).map(([x, y]) => [x, y, 2]), { size: 0.45 }));
    const post = { x: px - 5, y: POST_Y - 5, w: 10, d: 10, r: 1.5 };
    out.push(S(slab(post, 2, RAIL_Z - 2, 3, 0.5), { tone: "mid", inner: L([16, 40].map((z) => k.sideSeam(post, z, P, 3)).join(""), { tone: "faint" }) }));
  }
  const ticks = k.sideTicks(-100, 100, 5, 5, RAIL.y + RAIL.d, RAIL_TOP, [1.6, 3.2], P, "x");
  out.push(S(slab(RAIL, RAIL_Z, RAIL_TOP - RAIL_Z, 3, 0.6), { tone: "mid", inner: L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) }));
  // linear guide on the rail top, bolted every 20
  const guide = { x: -98, y: RAIL.y + 4, w: 196, d: 4, r: 0.6 };
  out.push(S(slab(guide, RAIL_TOP, GUIDE_H, 2, 0.3), { tone: "mid" }));
  out.push(D(Array.from({ length: 10 }, (_, i) => [-90 + i * 20, RAIL.y + 6, RAIL_TOP + GUIDE_H]), { size: 0.4 }));
  out.push(D(POSTS.map((px) => [px, RAIL.y + 1.8, RAIL_TOP]), { size: 0.5 }));
  for (const x of [-104, 104]) {
    const stop = { x: x - 2, y: RAIL.y + 1, w: 4, d: RAIL.d - 2, r: 0.8 };
    out.push(S(slab(stop, RAIL_TOP, 4, 3, 0.3), { tone: "mid" }));
    out.push(D([[x, RAIL.y + 3, RAIL_TOP + 4], [x, RAIL.y + RAIL.d - 3, RAIL_TOP + 4]], { size: 0.4 }));
  }
  // stepper motor on the rail's right end
  const flange = { x: 122, y: -68, w: 2, d: 16, r: 0.6 };
  out.push(S(slab(flange, 52, 16, 2, 0.3), { tone: "mid" }));
  const motor = { x: 124, y: -67, w: 13, d: 14, r: 1.4 };
  out.push(S(slab(motor, 53, 14, 3, 0.5), { tone: "mid", inner: L([57, 63].map((z) => k.sideSeam(motor, z, P, 3)).join(""), { tone: "faint" }) }));
  out.push(D([[137, -64, 55.5], [137, -56, 55.5], [137, -64, 64.5], [137, -56, 64.5]], { size: 0.45 }));
  const plug = { x: 127, y: -63, w: 6, d: 6, r: 0.8 };
  out.push(S(slab(plug, 67, 2.6, 2, 0.3), { tone: "mid" }));
  out.push(D([[130, -60, 69.6]], { size: 0.45 }));
  return out.join("");
}

// ---------- tray: floor, walls, fences, nests ----------
function tray() {
  const out = [];
  out.push(S(slab(TRAY, 0, FLOOR, 4, 0.5), { tone: "mid" }));
  const wall = (plan) => S(slab(plan, FLOOR, WALL_TOP - FLOOR, 2, 0.4), { tone: "mid" });
  const back = { x: -100, y: -46, w: 200, d: 3, r: 0.6 };
  const front = { x: -100, y: 43, w: 200, d: 3, r: 0.6 };
  const left = { x: -100, y: -43, w: 3, d: 86, r: 0.4 };
  const right = { x: 97, y: -43, w: 3, d: 86, r: 0.4 };
  out.push(wall(back), wall(left));
  // bay floors: a faint inset outline on the floor of each bay
  const bayPlans = {
    BL: { x: -97, y: -43, w: 64, d: 43 },
    BM: { x: -33, y: -43, w: 66, d: 43 },
    BR: { x: 33, y: -43, w: 64, d: 43 },
    FL: { x: -97, y: 0, w: 64, d: 43 },
    FM: { x: -33, y: 0, w: 66, d: 43 },
    FR: { x: 33, y: 0, w: 64, d: 43 },
  };
  for (const plan of Object.values(bayPlans)) {
    out.push(L(k.planOutline({ ...k.insetPlan({ ...plan, r: 0 }, 4), r: 2 }, FLOOR, P, 3), { tone: "faint" }));
    // a small tag plate in the bay's front corner: the system's name, engraved
    const tag = { x: plan.x + plan.w - 24, y: plan.y + 7, w: 16, d: 6, r: 0.8 };
    out.push(S(slab(tag, FLOOR, 0.7, 2), { tone: "lo", crease: "none" }));
    out.push(L([0, 1].map((row) => k.lineOnTop([tag.x + 3, tag.y + 2 + row * 2], [tag.x + (row ? 9 : 13), tag.y + 2 + row * 2], FLOOR + 0.7, P)).join(""), { tone: "lo", free: true }));
  }
  // the head's soft shadow on the floor, moved with the head
  out.push(`<g data-part="shadow" transform="${k.translateAlong(P, [0, 0, 0])}"><path class="iso-halo" style="filter:blur(2.5px)" d="${k.haloOf({ x: HX0 - 7, y: HY0 - 8, w: 14, d: 16, r: 6 }, FLOOR, 0.1, P)}"/></g>`);

  const pad = ([x, y]) => {
    const parts = [S(k.cylinder(x, y, PAD_R, FLOOR, M.PAD_TOP - FLOOR, P, 40, 0.5), { tone: "mid", inner: L(k.sideArc(x, y, PAD_R, FLOOR + 3, P, 24), { tone: "faint" }) })];
    parts.push(L(k.ring(x, y, 5.6, M.PAD_TOP, P, 32), { tone: "lo" }));
    parts.push(D([[x - 6.4, y, M.PAD_TOP], [x + 6.4, y, M.PAD_TOP]], { size: 0.4 }));
    return parts.join("");
  };
  const fence = (plan) => S(slab(plan, FLOOR, FENCE_TOP - FLOOR, 2, 0.3), { tone: "mid" });
  const yFence = (x, y0, y1) => fence({ x: x - 1, y: y0, w: 2, d: y1 - y0, r: 0.3 });
  const xFence = (x0, x1) => fence({ x: x0, y: -1, w: x1 - x0, d: 2, r: 0.3 });
  const junction = (x) => S(slab({ x: x - 2, y: -2, w: 4, d: 4, r: 0.6 }, FLOOR, FENCE_TOP + 0.6 - FLOOR, 2, 0.3), { tone: "mid" }) + D([[x, 0, FENCE_TOP + 0.6]], { size: 0.45 });

  const backRow = byDepth([
    ...["BL", "BM", "BR"].map((b) => ({ at: M.BAYS[b], svg: pad(M.BAYS[b]) })),
    { at: [-33, -22], svg: yFence(-33, -43, -2) },
    { at: [33, -22], svg: yFence(33, -43, -2) },
  ]);
  const middle = byDepth([
    { at: [-66, 0], svg: xFence(-97, -35) },
    { at: [0, 0], svg: xFence(-31, 31) },
    { at: [66, 0], svg: xFence(35, 97) },
    { at: [-33, 0.1], svg: junction(-33) },
    { at: [33, 0.1], svg: junction(33) },
  ]);
  const frontRow = byDepth([
    ...["FL", "FM", "FR"].map((b) => ({ at: M.BAYS[b], svg: pad(M.BAYS[b]) })),
    { at: [-33, 22], svg: yFence(-33, 2, 43) },
    { at: [33, 22], svg: yFence(33, 2, 43) },
  ]);
  for (const item of [...backRow, ...middle, ...frontRow]) out.push(item.svg);
  out.push(wall(right), wall(front));
  const wallScrews = [[-98.5, -44.5], [98.5, -44.5], [-98.5, 44.5], [98.5, 44.5], [0, -44.5], [0, 44.5]];
  out.push(D(wallScrews.map(([x, y]) => [x, y, WALL_TOP]), { size: 0.45 }));
  return out.join("");
}

// ---------- the x carriage on the rail, the arm, the Z slide ----------
function carriage(hx) {
  const out = [];
  const saddle = { x: hx - 11, y: RAIL.y - 1, w: 22, d: RAIL.d + 1, r: 1.2 };
  out.push(S(slab(saddle, RAIL_TOP + GUIDE_H, 2.5, 3, 0.4), { tone: "mid" }));
  out.push(D([[hx - 7, RAIL.y + 2.5, RAIL_TOP + GUIDE_H + 2.5], [hx + 7, RAIL.y + 2.5, RAIL_TOP + GUIDE_H + 2.5]], { size: 0.45 }));
  const block = { x: hx - 12, y: RAIL.y + RAIL.d, w: 24, d: 8, r: 1.5 };
  out.push(S(slab(block, 50, RAIL_TOP + GUIDE_H + 2.5 - 50, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(block, 58, P, 3), { tone: "faint" }) }));
  const face = block.y + block.d;
  out.push(D([[hx - 9, face, 53], [hx + 9, face, 53], [hx - 9, face, 63.5], [hx + 9, face, 63.5]], { size: 0.45 }));
  return out.join("");
}
const beamBack = (hx, hy) => slab({ x: hx - 4, y: BEAM_FROM, w: 8, d: hy - SLIDE.hy - BEAM_FROM, r: 0.8 }, BEAM_Z, BEAM_TOP - BEAM_Z, 2, 0.4);
const beamFront = (hx, hy) => slab({ x: hx - 4, y: hy + SLIDE.hy, w: 8, d: BEAM_TO - hy - SLIDE.hy, r: 0.8 }, BEAM_Z, BEAM_TOP - BEAM_Z, 2, 0.4);
function endCap(hx) {
  const cap = { x: hx - 5, y: BEAM_TO, w: 10, d: 2.5, r: 0.8 };
  return S(slab(cap, BEAM_Z - 1, BEAM_TOP - BEAM_Z + 2, 2, 0.3), { tone: "mid" }) + D([[hx - 2.6, BEAM_TO + 2.5, BEAM_Z + 2], [hx + 2.6, BEAM_TO + 2.5, BEAM_Z + 7]], { size: 0.4 });
}
function slider(hx, hy) {
  const plan = { x: hx - SLIDE.hx, y: hy - SLIDE.hy, w: SLIDE.hx * 2, d: SLIDE.hy * 2, r: 1.5 };
  const out = [S(slab(plan, SLIDE.z0, SLIDE.z1 - SLIDE.z0, 3, 0.5), { tone: "mid", inner: L([50, 66].map((z) => k.sideSeam(plan, z, P, 3)).join(""), { tone: "faint" }) })];
  const cap = k.insetPlan(plan, 1.5);
  out.push(S(slab(cap, SLIDE.z1, 1.6, 3, 0.3), { tone: "mid" }));
  out.push(D([[cap.x + 2, cap.y + 2, SLIDE.z1 + 1.6], [cap.x + cap.w - 2, cap.y + cap.d - 2, SLIDE.z1 + 1.6], [cap.x + 2, cap.y + cap.d - 2, SLIDE.z1 + 1.6], [cap.x + cap.w - 2, cap.y + 2, SLIDE.z1 + 1.6]], { size: 0.42 }));
  const fx = hx + SLIDE.hx;
  out.push(D([[fx, hy - 3.5, 55], [fx, hy + 3.5, 55], [fx, hy - 3.5, 61], [fx, hy + 3.5, 61]], { size: 0.42 }));
  return out.join("");
}

// ---------- the head: gripper, fingers, the part (an import) ----------
function head(hx, hy, zb) {
  const out = [];
  const finger = (y) => S(slab({ x: hx - 2.5, y, w: 5, d: 1.6, r: 0.4 }, zb + 4, 8, 2, 0.2), { tone: "mid" });
  out.push(finger(hy - 7.0));
  out.push(S(k.cylinder(hx, hy, 5, zb, 8, P, 36, 0.4), { tone: "hi", crease: "lo", inner: L(k.sideArc(hx, hy, 5, zb + 2.4, P, 20), { tone: "faint" }) }));
  out.push(L(k.ring(hx, hy, 2.6, zb + 8, P, 24), { tone: "lo" }));
  out.push(D([[hx, hy, zb + 8]], { size: 0.5, tone: "hi" }));
  out.push(finger(hy + 5.4));
  const body = { x: hx - 4.5, y: hy - 7.5, w: 9, d: 15, r: 1.2 };
  out.push(S(slab(body, zb + 12, 5, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(body, zb + 14.5, P, 3), { tone: "faint" }) }));
  out.push(D([[hx - 2.8, hy - 5.5, zb + 17], [hx + 2.8, hy + 5.5, zb + 17], [hx - 2.8, hy + 5.5, zb + 17], [hx + 2.8, hy - 5.5, zb + 17]], { size: 0.4 }));
  out.push(S(k.cylinder(hx, hy, 3.4, zb + 17, 2, P, 28, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(hx, hy, 2.6, zb + 19, 29, P, 24), { tone: "mid", crease: "none", inner: L([zb + 25, zb + 28].map((z) => k.sideArc(hx, hy, 2.6, z, P, 16)).join(""), { tone: "faint" }) }));
  return out.join("");
}

// ---------- limit switches on the fault lines ----------
const SW_BODY_TOP = 16;
function switchSvg(sw, lit) {
  const [x, y] = sw.at;
  const along = sw.travel === "x" ? "y" : "x"; // the fence runs along the other axis
  const plan = along === "y" ? { x: x - 2.5, y: y - 3.5, w: 5, d: 7, r: 0.8 } : { x: x - 3.5, y: y - 2.5, w: 7, d: 5, r: 0.8 };
  const out = [S(slab(plan, FENCE_TOP, SW_BODY_TOP - FENCE_TOP, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(plan, FENCE_TOP + 2, P, 3), { tone: "faint" }) })];
  const screws = along === "y" ? [[x, y - 2.4], [x, y + 2.4]] : [[x - 2.4, y], [x + 2.4, y]];
  out.push(D(screws.map(([sx, sy]) => [sx, sy, SW_BODY_TOP]), { size: 0.4 }));
  const ear = (off) => {
    const e = along === "y" ? { x: x - 1.2, y: y + off - 0.4, w: 2.4, d: 0.8, r: 0.2 } : { x: x + off - 0.4, y: y - 1.2, w: 0.8, d: 2.4, r: 0.2 };
    return S(slab(e, SW_BODY_TOP, 2.6, 2), { tone: "mid", crease: "none" });
  };
  out.push(ear(-1.5));
  const f = flagSolids(sw, 0, M.PIVOT_Z, P);
  out.push(liveSolid(f.lever, { tone: lit ? "hi" : "mid", part: `${sw.id}-lever`, lit }));
  out.push(liveSolid(f.plate, { tone: lit ? "hi" : "mid", part: `${sw.id}-flag`, lit }));
  out.push(ear(1.5));
  return `<g data-part="${sw.id}" data-k="${depth(sw.at).toFixed(3)}">${out.join("")}</g>`;
}

// ---------- assemble ----------
const cross = [
  ...M.SWITCHES.map((sw, i) => ({ key: depth(sw.at), svg: switchSvg(sw, i === 0) })),
  { key: depth([HX0, HY0]), svg: `<g data-part="head" data-k="${depth([HX0, HY0]).toFixed(3)}">${head(HX0, HY0, ZB0)}</g>` },
].sort((a, b) => a.key - b.key);

const LABEL =
  "A sorting jig on a bench. A tray is divided by fixed fences into six bays, the systems you declared. A pick-and-place arm on a gantry carries a part, an import, from bay to bay. Allowed moves set the part down in its new bay; three fences are fault lines and carry a limit-switch flag, and a move that would cross one trips the flag and the arm stops short. In the pilot, 0 of 6 forbidden imports shipped with faultline, against 3 of 6 without it.";

const body = [
  base(),
  gantry(),
  tray(),
  `<g data-part="carriage">${carriage(HX0)}</g>`,
  liveSolid(beamBack(HX0, HY0), { part: "beam-back" }),
  `<g data-part="cross">${cross.map((c) => c.svg).join("")}</g>`,
  `<g data-part="slider">${slider(HX0, HY0)}</g>`,
  liveSolid(beamFront(HX0, HY0), { part: "beam-front" }),
  `<g data-part="cap">${endCap(HX0)}</g>`,
];

const svg = k.figureSvg({ width: W, height: H, label: LABEL, body });
writeFileSync(join(SRC, "faultline.svg"), svg + "\n");

// ---------- live module ----------
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");
const DATA = {
  P,
  REST: [HX0, HY0, ZB0],
  BEAM: { z: BEAM_Z, top: BEAM_TOP, from: BEAM_FROM, to: BEAM_TO, slide: SLIDE.hy },
  SW_IDS: M.SWITCHES.map((s) => s.id),
};
const liveBody = `
const DATA = ${JSON.stringify(DATA)};
const P = DATA.P;
${strip("model.mjs")}
${strip("flag.mjs")}
${readFileSync(join(HERE, "live-core.js"), "utf8")}
`;
const LIVE = `// Generated by figures/faultline/build.mjs. Do not edit by hand.
import { slabOf, translateAlong, depthOf } from "../../vendor/anatomy/kit/iso-kit.mjs";
${liveBody}`;
writeFileSync(join(SRC, "faultline.live.js"), LIVE);

// ---------- previews ----------
const plate = k.plateHtml({
  fig: "Fig 6",
  title: "Fault line jig",
  hint: "Point at a bay to send the part",
  readout: M.readoutOf(-1),
  keys: [
    { mark: "lit", label: "Limit-switch flag: a fault line the arm may not cross" },
    { mark: "raised", label: "Six bays behind fixed fences: the systems you declared" },
  ],
  caption: `The arm carries an import from bay to bay. Allowed moves land; a move across a fault line trips the flag and stops short. In the pilot agents shipped ${M.SHIPPED_WITH} of ${M.ATTEMPTS} forbidden imports with faultline, ${M.SHIPPED_WITHOUT} of ${M.ATTEMPTS} without it.`,
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Fault line jig: arrow keys pick a bay for the arm">${svg}</div>`,
});
const pageScript = kitScript() + liveBody.replace(/^export /gm, "") + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
for (const theme of ["light", "dark"]) {
  writeFileSync(join(HERE, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "Fault line jig", theme, body: plate, script: pageScript, width: 560 }));
}
console.log("faultline: wrote svg, live.js, previews");
