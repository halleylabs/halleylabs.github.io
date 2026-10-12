// node build.mjs  writes src/figures/guardian.svg, src/figures/guardian.live.js,
// figures/guardian/preview-light.html and preview.html.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import { armSolid } from "./box.mjs";
import { tokenPaths, tokenDots, cleatsPath } from "./draw.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src", "figures");
const AZ = 52;
const W = 480;
const H = 320;

// ---------- world ----------
const PLATE = { x: -122, y: -72, w: 244, d: 144, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const CH_Z = 8;
const CH_TOP = 17;
const BH = 20; // belt half width
const BELT = { x: -102, y: -BH, w: 204, d: BH * 2, r: 0.5 };
const BELT_Z = 13;
const BT = M.BELT_TOP;
const HOOD_TOP = 27;
const BIN = { x: M.STOP - 11, y: BH + 6, w: 22, d: 36 };
const BX = -20; // bridge axis = inspection station
const BEAM_Z = 44;
const BEAM_TOP = 52;
const HEAD_Z = 30;
const PROBE_REST = BT + M.TOKEN.h + 5; // tip 5 above a token's top
const PROBE_DROP = 5;
const PIVOT = [M.GATE, -BH - 6, 20.8];
const ARM_LEN = 48;
const ARM_HALF = [M.ARM_HALF, 2];
const ARM_UP = (80 * Math.PI) / 180;
const PAD_REST = -BH - 6.4;
const PAD_MAX = M.BIN_Y - M.TOKEN.wide / 2 - 2;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [BX - 7, -41, BEAM_TOP], [BX + 7, 41, BEAM_TOP]],
  W,
  H,
  { pad: 22, azimuth: AZ, elevation: 30 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style = {}) => k.solidSvg(paths, { tone: "mid", ...style });
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points.map(at), style);
const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const depth = ([x, y], z = 0) => k.depthOf([x, y, z], P);
const byDepth = (items) => [...items].sort((a, b) => a.key - b.key);
const onFace = (pts) => k.pathOf(pts.map(at), true);

function liveSolid(paths, { tone = "mid", part, lit = false, crease = "faint" } = {}) {
  const p = paths || { fill: "", shades: [], top: "", crease: "", bevel: "", outline: "" };
  const shade = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${p.shades[i] || ""}"/>`).join("");
  return `<g class="iso-solid"${part ? ` data-part="${part}"` : ""}${lit ? ' data-lit=""' : ""}><path class="iso-fill" d="${p.fill}"/>${shade}<path class="iso-top" d="${p.top}"/><path class="iso-line iso-crease" data-tone="${crease}" d="${p.crease || ""}"/><path class="iso-line iso-bevel" data-tone="${crease}" d="${p.bevel || ""}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${p.outline}"/></g>`;
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
  const strip = { x: -64, y: 58, w: 84, d: 7, r: 1 };
  out.push(S(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([[strip.x + 2, strip.y + 3.5, 0.6], [strip.x + strip.w - 2, strip.y + 3.5, 0.6]], { size: 0.45 }));
  const label = { x: -112, y: 52, w: 42, d: 13, r: 1.6 };
  out.push(S(slab(label, 0, 0.8, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([label.x + 7, label.y + 4 + row * 2.5], [label.x + (row === 1 ? 26 : 34), label.y + 4 + row * 2.5], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([[label.x + 3.5, label.y + label.d / 2, 0.8], [label.x + label.w - 3.5, label.y + label.d / 2, 0.8]], { size: 0.45 }));
  // control station: a box with an emergency stop and two pilot buttons
  const box = { x: 90, y: 40, w: 24, d: 17, r: 1.6 };
  out.push(S(slab(box, 0, 12, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(box, 3, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners(box, 2).map(([x, y]) => [x, y, 12]), { size: 0.42 }));
  out.push(S(k.cylinder(97, 48.5, 4.6, 12, 1.2, P, 32, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(97, 48.5, 2.2, 13.2, 1.6, P, 24), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(97, 48.5, 4, 14.8, 2.6, P, 36, 0.4), { tone: "mid", inner: L(k.sideArc(97, 48.5, 4, 16, P, 24), { tone: "faint" }) }));
  for (const [x, y] of [[107, 44.5], [107, 52.5]]) {
    out.push(S(k.cylinder(x, y, 2, 12, 1.4, P, 20, 0.3), { tone: "mid" }));
    out.push(L(k.ring(x, y, 1.1, 13.4, P, 16), { tone: "lo" }));
  }
  return out.join("");
}

// ---------- the far side: legs, bridge leg, drive, pusher cylinder, gate cabinet ----------
const convLeg = (x, y0) => {
  const plan = { x: x - 3, y: y0, w: 6, d: 4, r: 0.6 };
  const foot = { x: x - 5, y: y0 - 1.5, w: 10, d: 7, r: 1 };
  return S(slab(foot, 0, 1.4, 2, 0.3), { tone: "lo" }) + D([[x - 3.6, y0 + 2, 1.4], [x + 3.6, y0 + 2, 1.4]], { size: 0.4 }) + S(slab(plan, 1.4, CH_Z - 1.4, 2, 0.3), { tone: "mid" });
};
const bridgeLeg = (y0) => {
  const foot = { x: BX - 7, y: y0 - 3, w: 14, d: 12, r: 1.5 };
  const leg = { x: BX - 4, y: y0, w: 8, d: 6, r: 1 };
  return (
    S(slab(foot, 0, 2, 3, 0.4), { tone: "mid" }) +
    D(k.corners(foot, 2.2).map(([x, y]) => [x, y, 2]), { size: 0.42 }) +
    S(slab(leg, 2, BEAM_Z - 2, 3, 0.5), { tone: "mid", inner: L([14, 30].map((z) => k.sideSeam(leg, z, P, 3)).join(""), { tone: "faint" }) })
  );
};
function rear() {
  const items = [];
  for (const x of [-60, 60]) items.push({ key: depth([x, -BH - 2]), svg: convLeg(x, -BH - 4) });
  items.push({ key: depth([BX, -36]), svg: bridgeLeg(-39) });
  // belt drive: gear motor on the far side, coupled into the channel
  const motor = { x: 82, y: -46, w: 16, d: 13, r: 1.4 };
  const drive =
    S(slab({ x: 80, y: -48, w: 20, d: 17, r: 1.5 }, 0, 3, 3, 0.4), { tone: "mid" }) +
    S(slab(motor, 3, 17, 3, 0.5), { tone: "mid", inner: L([8, 15].map((z) => k.sideSeam(motor, z, P, 3)).join(""), { tone: "faint" }) }) +
    D([[98, -43, 6], [98, -36, 6], [98, -43, 17], [98, -36, 17]], { size: 0.42 }) +
    S(slab({ x: 87, y: -33, w: 6, d: 9, r: 0.8 }, 9, 6, 2, 0.3), { tone: "mid" });
  items.push({ key: depth([90, -40]), svg: drive });
  // pusher: a square-section cylinder on a bracket, behind the belt at the hold station
  const sx = M.STOP;
  const bracket = { x: sx - 5, y: RAM_FROM - 14, w: 10, d: 12, r: 1 };
  const body = { x: sx - 4, y: RAM_FROM - 14, w: 8, d: 14, r: 1.2 };
  const pusher =
    S(slab(bracket, 0, 14, 3, 0.4), { tone: "mid" }) +
    S(slab(body, 14, 10, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(body, 19, P, 3), { tone: "faint" }) }) +
    D([[sx - 2.4, RAM_FROM - 12, 24], [sx + 2.4, RAM_FROM - 2, 24], [sx - 2.4, RAM_FROM - 2, 24], [sx + 2.4, RAM_FROM - 12, 24]], { size: 0.4 }) +
    S(k.cylinder(sx + 1.5, RAM_FROM - 8, 1.2, 24, 2, P, 14), { tone: "mid" });
  items.push({ key: depth([sx, RAM_FROM - 8]), svg: pusher });
  // gate cabinet and hub
  const cab = { x: M.GATE - 3, y: PIVOT[1] - 14, w: 8, d: 10, r: 1 };
  const hub = { x: M.GATE - 2, y: PIVOT[1] - 4, w: 4, d: 4, r: 0.8 };
  const gate =
    S(slab(cab, 0, 20, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(cab, 8, P, 3), { tone: "faint" }) }) +
    D([[cab.x + 2, cab.y + 2, 20], [cab.x + cab.w - 2, cab.y + cab.d - 2, 20]], { size: 0.42 }) +
    L(onFace([[cab.x + cab.w, cab.y + 2.5, 15.5], [cab.x + cab.w, cab.y + 7.5, 15.5], [cab.x + cab.w, cab.y + 7.5, 11.5], [cab.x + cab.w, cab.y + 2.5, 11.5]]), { tone: "lo" }) +
    S(slab(hub, 17, 7.6, 2, 0.4), { tone: "mid" });
  items.push({ key: depth([M.GATE, cab.y + 5]), svg: gate });
  return byDepth(items).map((i) => i.svg).join("");
}

// ---------- belt and channels ----------
function farChannel() {
  const ch = { x: -102, y: -BH - 4, w: 204, d: 4, r: 0.5 };
  return S(slab(ch, CH_Z, CH_TOP - CH_Z, 2, 0.3), { tone: "mid" }) + D([-70, -40, -10, 20, 50, 74].map((x) => [x, -BH - 2, CH_TOP]), { size: 0.4 });
}
function belt() {
  return S(slab(BELT, BELT_Z, BT - BELT_Z, 2, 0), { tone: "mid", crease: "faint" }) + `<path class="iso-line" data-tone="faint" data-part="cleats" d="${cleatsPath(0, 8, M.MOUTH_IN, M.MOUTH_OUT, BH, BT, k.iso, P)}"/>`;
}
function hood(x0, mouthShown) {
  const plan = { x: x0, y: -BH - 9, w: 20, d: BH * 2 + 18, r: 2 };
  const out = [S(slab(plan, CH_Z, HOOD_TOP - CH_Z, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(plan, 13, P, 4), { tone: "faint" }) })];
  out.push(D(k.corners(plan, 3.5).map(([x, y]) => [x, y, HOOD_TOP]), { size: 0.45 }));
  // vent slots on the lid: closed outlines
  for (const dy of [-15, -5, 5, 15]) out.push(L(k.planOutline({ x: x0 + 4, y: dy - 1.2, w: 12, d: 2.4, r: 1.2 }, HOOD_TOP, P, 3), { tone: "lo" }));
  if (mouthShown) {
    const fx = x0 + 20;
    out.push(L(onFace([[fx, -17, BT], [fx, 17, BT], [fx, 17, BT + 8], [fx, -17, BT + 8]]), { tone: "lo" }));
    const strips = [];
    for (let y = -14; y <= 14; y += 4) strips.push(k.segment([fx, y, BT + 8], [fx, y, BT], P));
    out.push(L(strips.join(""), { tone: "faint" }));
  }
  return out.join("");
}

// ---------- reject bin (back wall and floor behind the tokens) ----------
function binBack() {
  const out = [];
  out.push(S(slab({ ...BIN, r: 1 }, 0, M.BIN_FLOOR, 3, 0.3), { tone: "mid" }));
  out.push(L(k.planOutline({ x: BIN.x + 4, y: BIN.y + 5, w: BIN.w - 8, d: BIN.d - 9, r: 1.5 }, M.BIN_FLOOR, P, 3), { tone: "faint" }));
  out.push(S(slab({ x: BIN.x, y: BIN.y, w: BIN.w, d: 2, r: 0.4 }, M.BIN_FLOOR, 15 - M.BIN_FLOOR, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: BIN.x, y: BH, w: BIN.w, d: 6, r: 0.3 }, BELT_Z, BT - BELT_Z, 2, 0.3), { tone: "mid" }));
  return out.join("");
}
function binFront() {
  const out = [];
  const left = { x: BIN.x, y: BIN.y + 2, w: 2, d: BIN.d - 4, r: 0.4 };
  const right = { x: BIN.x + BIN.w - 2, y: BIN.y + 2, w: 2, d: BIN.d - 4, r: 0.4 };
  const front = { x: BIN.x, y: BIN.y + BIN.d - 2, w: BIN.w, d: 2, r: 0.4 };
  out.push(S(slab(left, M.BIN_FLOOR, 18 - M.BIN_FLOOR, 2, 0.3), { tone: "mid" }));
  out.push(S(slab(right, M.BIN_FLOOR, 18 - M.BIN_FLOOR, 2, 0.3), { tone: "mid" }));
  out.push(S(slab(front, M.BIN_FLOOR, 18 - M.BIN_FLOOR, 2, 0.3), { tone: "mid" }));
  out.push(D([[BIN.x + 1, BIN.y + 4, 18], [BIN.x + BIN.w - 1, BIN.y + 4, 18], [BIN.x + 1, BIN.y + BIN.d - 1, 18], [BIN.x + BIN.w - 1, BIN.y + BIN.d - 1, 18]], { size: 0.42 }));
  return out.join("");
}

// ---------- pusher ram (rebuilt live) ----------
const RAM_FROM = -BH - 14;
const ramPaths = (padY) => slab({ x: M.STOP - 1.5, y: RAM_FROM, w: 3, d: padY - RAM_FROM, r: 0.5 }, 18.5, 3, 2, 0.2);
const padPaths = (padY) => slab({ x: M.STOP - 7, y: padY, w: 14, d: 2, r: 0.5 }, 17.2, 5.6, 2, 0.3);

// ---------- tokens and the gate arm ----------
const SIZE = M.TOKEN;
const MOUTHS = [M.MOUTH_IN, M.MOUTH_OUT];
function tokenSvg(i, x) {
  const t = { x, y: 0, z: BT };
  const paths = tokenPaths(t, SIZE, MOUTHS, k.slabOf, P);
  const dots = tokenDots(t, SIZE, M.PROBES, MOUTHS, k.iso, P);
  const circles = dots.map((p) => `<circle cx="${p ? p[0].toFixed(1) : 0}" cy="${p ? p[1].toFixed(1) : 0}" r="0.55"${p ? "" : ' style="display:none"'}/>`).join("");
  return `<g data-part="token-${i}">${liveSolid(paths, { tone: "hi", crease: "lo" })}<g class="iso-dots" data-tone="lo">${circles}</g></g>`;
}
const armSvg = (a) => `<g data-part="arm">${liveSolid(armSolid(PIVOT, ARM_LEN, ARM_HALF, a, P), { tone: "hi", lit: true })}</g>`;

// ---------- bridge: probes, heads, crossbeam ----------
function probeSvg(py) {
  const out = [];
  out.push(S(k.cylinder(BX, py, 0.9, PROBE_REST + 1, HEAD_Z + 6 - PROBE_REST - 1, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(BX, py, 1.5, PROBE_REST, 1, P, 16), { tone: "mid" }));
  return out.join("");
}
function headSvg(py) {
  const plan = { x: BX - 5, y: py - 3.8, w: 10, d: 7.6, r: 0.9 };
  const out = [S(k.cylinder(BX, py, 1.7, HEAD_Z - 1.2, 1.2, P, 16), { tone: "mid" })];
  out.push(S(slab(plan, HEAD_Z, BEAM_Z - HEAD_Z, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(plan, HEAD_Z + 3, P, 2), { tone: "faint" }) }));
  const fx = BX + 5;
  out.push(L(onFace([[fx, py - 2.4, 40.5], [fx, py + 2.4, 40.5], [fx, py + 2.4, 36.5], [fx, py - 2.4, 36.5]]), { tone: "lo" }));
  out.push(D([[fx, py - 2.2, 33.4], [fx, py + 2.2, 33.4]], { size: 0.42 }));
  return out.join("");
}
function crossbeam() {
  const plan = { x: BX - 7, y: -41, w: 14, d: 82, r: 1.5 };
  return (
    S(slab(plan, BEAM_Z, BEAM_TOP - BEAM_Z, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, BEAM_Z + 2.5, P, 3), { tone: "faint" }) }) +
    D([[BX, -37, BEAM_TOP], [BX, 37, BEAM_TOP], [BX - 3, -12, BEAM_TOP], [BX - 3, 0, BEAM_TOP], [BX - 3, 12, BEAM_TOP]], { size: 0.45 }) +
    L(k.planOutline({ x: BX + 0.5, y: -20, w: 3, d: 40, r: 1.5 }, BEAM_TOP, P, 3), { tone: "lo" })
  );
}

// ---------- near side ----------
function nearChannels() {
  const a = { x: M.MOUTH_IN, y: BH, w: BIN.x - M.MOUTH_IN, d: 4, r: 0.4 };
  const b = { x: BIN.x + BIN.w, y: BH, w: M.MOUTH_OUT - BIN.x - BIN.w, d: 4, r: 0.4 };
  return (
    convLeg(-60, BH) +
    S(slab(a, CH_Z, CH_TOP - CH_Z, 2, 0.3), { tone: "mid" }) +
    D([-70, -40, -10, 14].map((x) => [x, BH + 2, CH_TOP]), { size: 0.4 }) +
    convLeg(60, BH) +
    S(slab(b, CH_Z, CH_TOP - CH_Z, 2, 0.3), { tone: "mid" }) +
    D([60, 76].map((x) => [x, BH + 2, CH_TOP]), { size: 0.4 })
  );
}

// ---------- assemble ----------
const restTokens = M.REST_TOKENS.map((x, i) => ({ i, x, key: depth([x, 0], BT) }));
const cross = byDepth([...restTokens.map((t) => ({ key: t.key, svg: tokenSvg(t.i, t.x) })), { key: depth([M.GATE, -2], 20), svg: armSvg(0) }]);

const LABEL =
  "A checkpoint on a short conveyor. Each proposed agent action is a token on the belt. It stops under a bridge carrying four inspection heads side by side, for destructive, off-task, injection and leak, and all four probes read it at once for about 400 ms. A gate arm lifts for a safe token and stays down for a hazardous one, which a pusher clears into a reject bin. On the 44-action benchmark it caught 100% of hazardous actions and blocked 0% of legitimate work.";

const body = [
  base(),
  rear(),
  farChannel(),
  belt(),
  hood(M.MOUTH_IN - 20, true),
  binBack(),
  `<g data-part="pusher">${liveSolid(ramPaths(PAD_REST), { part: "ram" })}${liveSolid(padPaths(PAD_REST), { part: "pad" })}</g>`,
  `<g data-part="cross">${cross.map((c) => c.svg).join("")}</g>`,
  nearChannels(),
  bridgeLeg(33),
  `<g data-part="probes">${M.PROBES.map((py) => probeSvg(py)).join("")}</g>`,
  [...M.PROBES].sort((a, b) => a - b).map((py) => headSvg(py)).join(""),
  crossbeam(),
  binFront(),
  hood(M.MOUTH_OUT, false),
];

const svg = k.figureSvg({ width: W, height: H, label: LABEL, body });
writeFileSync(join(SRC, "guardian.svg"), svg + "\n");

// ---------- live module ----------
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");
const DATA = { P, PIVOT, ARM_LEN, ARM_HALF, ARM_UP, PAD_REST, PAD_MAX, PROBE_DROP, RAM_FROM, BH };
const liveBody = `
const DATA = ${JSON.stringify(DATA)};
const P = DATA.P;
${strip("model.mjs")}
${strip("box.mjs")}
${strip("draw.mjs")}
${readFileSync(join(HERE, "live-core.js"), "utf8")}
`;
writeFileSync(join(SRC, "guardian.live.js"), `// Generated by figures/guardian/build.mjs. Do not edit by hand.\nimport { slabOf, iso, translateAlong, depthOf } from "../../vendor/anatomy/kit/iso-kit.mjs";\n${liveBody}`);

const plate = k.plateHtml({
  fig: "Fig 7",
  title: "Action checkpoint",
  hint: "Click to send an action",
  readout: M.REST_TEXT,
  keys: [
    { mark: "lit", label: "Gate arm: lifts for a safe action, stays down for a hazardous one" },
    { mark: "raised", label: "Four inspection heads that read every action at once" },
  ],
  caption: `Every proposed action stops under four heads, destructive, off-task, injection and leak, read in parallel in about ${M.READ_MS} ms. On the ${M.BENCHMARK}-action benchmark guardian caught ${M.CAUGHT}% of hazardous actions and blocked ${M.LEGIT_BLOCKED}% of legitimate work.`,
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Action checkpoint: press Enter to send the next action">${svg}</div>`,
});
const pageScript = kitScript() + liveBody.replace(/^export /gm, "") + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
for (const theme of ["light", "dark"]) {
  writeFileSync(join(HERE, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "Action checkpoint", theme, body: plate, script: pageScript, width: 560 }));
}
console.log("guardian: wrote svg, live.js, previews");
