// pact: a notary's bench. A screw press signs each request with a signet, and a seal comparator walks a loupe along
// a chain of three wax seals (human, agent, request), each narrower than the last, all on one plate with no cable
// leaving it. `node build.mjs` writes every output.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import * as A from "../../vendor/anatomy/kit/audit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src", "figures");
mkdirSync(SRC, { recursive: true });
mkdirSync(join(HERE, "shots"), { recursive: true });

const W = 480;
const H = 320;
const AZ = 55;
const EL = 30;

// ---- world plan (units ~ px, z up) ----
const BASE = { x: -115, y: -68, w: 230, d: 136, r: 8 };
const BASE_H = 10;
const FOOT_H = 5;
const X = [-66, -6, 50]; // seal centres along the chain
const STAGE = { x: -104, y: -38, w: 190, d: 76, r: 4 };
const STAGE_TOP = 6;
const PARCH = { x: -96, y: -31, w: 174, d: 62, r: 0.6 };
const PARCH_TOP = STAGE_TOP + 0.8;
const RIBBON = { x: -94, y: -4, w: 170, d: 8, r: 0.5 };
const RIBBON_TOP = PARCH_TOP + 0.6;
const SEAL_H = 3.6;
const SEAL_TOP = RIBBON_TOP + SEAL_H;
const RAIL_Y = 46;
const LOUPE = { z0: 14.5, z1: 17.5, rIn: 22.5, rOut: 26 };
const BRIDGE_Z = 40;
// the press
const PX = X[2];
const ARM_Z = 72;
const GLAND_Z = 62;
const ROD_R = 3.2;
const ROD_LEN = 8;
const DIE = { r: M.SEALS[2].r, h: 3.5 };
const DIE_BOTTOM = GLAND_Z - ROD_LEN - DIE.h;
const STROKE = DIE_BOTTOM - SEAL_TOP;
const WHEEL = { r: 13, z: 89, h: 2.6, knob: 9.5, kr: 1.8, kh: 6, hub: 3, rim: 10.8 };

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [PX, 0, WHEEL.z + WHEEL.h + 7], [PX, -64, ARM_Z + 10], [PX + WHEEL.r, WHEEL.r, WHEEL.z + WHEEL.h]],
  W,
  H,
  { pad: 22, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);

// ---- recorder helpers ----
const R = A.recorder(P);
const rec = R.solid;
function put(name, ref, svg, shapes, { bias = 0, piece = "", move, part } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece, ...(move ? { move } : {}), part });
}
function box(name, plan, z, h, style = {}, { steps = 3, bevel = 0.5, inner = "", extra = "", bias = 0, piece, move, part } = {}) {
  const shape = rec(A.slab(plan, z, h, { name }, steps));
  const svg = S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra;
  return put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg, [shape], { bias, piece, move, part });
}
function post(name, cx, cy, r, z, h, style = {}, { steps = 28, bevel = 0, inner = "", extra = "", bias = 0, piece, move, part, wrap } = {}) {
  const shape = rec(A.cylinder(cx, cy, r, z, h, { name }));
  let svg = S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner });
  if (wrap) svg = wrap(svg);
  return put(name, [cx, cy, z + h / 2], svg + extra, [shape], { bias, piece, move, part });
}
const ellipse = (cx, cy, r, z, from, to, n = 48) => Array.from({ length: n + 1 }, (_, i) => at([cx + r * Math.cos(from + ((to - from) * i) / n), cy + r * Math.sin(from + ((to - from) * i) / n), z]));
const pathPts = (pts, closed = false) => k.pathOf(pts, closed);

// ---- base ----
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(BASE, 22))) {
  back.push(S(k.cylinder(x, y, 7, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "lo" }));
  rec(A.cylinder(x, y, 7, -BASE_H - FOOT_H, 1.6, { name: "stand.foot.flange" }));
  rec(A.cylinder(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, { name: "stand.foot" }));
}
back.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6), { tone: "lo", inner: Ln(k.sideSeam(BASE, -4, P, 8), { tone: "faint" }) }));
rec(A.slab(BASE, -BASE_H, BASE_H, { name: "stand.plate" }, 8));
back.push(Ln(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }));
const baseScrews = k.corners(BASE, 10);
back.push(Ln(baseScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(baseScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

// label plate: one engraved rule, like the one line of middleware that protects a route
const LABEL = { x: 74, y: 52, w: 34, d: 12, r: 1.2 };
box("stand.label", LABEL, 0, 0.8, { tone: "lo", crease: "none" }, {
  bevel: 0,
  extra:
    Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 3), { tone: "faint" }) +
    Ln(k.lineOnTop([LABEL.x + 7, LABEL.y + LABEL.d / 2], [LABEL.x + 26, LABEL.y + LABEL.d / 2], 0.8, P), { tone: "lo", free: true }) +
    Dots([at([LABEL.x + 3.2, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3.2, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }),
});

// ---- the comparator stage, the parchment, the ribbon and the three seals ----
box("stage", STAGE, 0, STAGE_TOP, { tone: "mid" }, {
  steps: 4,
  bevel: 0.6,
  extra: Dots(k.corners(STAGE, 3.4).map(([x, y]) => at([x, y, STAGE_TOP])), { size: 0.45 }),
});
{
  const rules = [];
  for (const [i, x] of X.entries()) {
    const r = M.SEALS[i].r;
    for (const [row, y] of [-28, -25].entries()) rules.push(k.lineOnTop([x - r, y], [x + r - (row ? 10 : 3), y], PARCH_TOP, P));
    rules.push(k.lineOnTop([x - r * 0.8, r + 5], [x + r * 0.8, r + 5], PARCH_TOP, P));
  }
  box("parchment", PARCH, STAGE_TOP, PARCH_TOP - STAGE_TOP, { tone: "mid", crease: "none" }, { steps: 2, bevel: 0, extra: Ln(rules.join(""), { tone: "lo", free: true }) });
  box("ribbon", RIBBON, PARCH_TOP, RIBBON_TOP - PARCH_TOP, { tone: "lo", crease: "none" }, { steps: 2, bevel: 0 });
  // parchment stops at both ends
  for (const x0 of [PARCH.x - 5, PARCH.x + PARCH.w]) {
    const stop = { x: x0, y: -14, w: 5, d: 28, r: 1 };
    box(`stage.stop${x0}`, stop, STAGE_TOP, 3, { tone: "mid" }, { steps: 2, bevel: 0.4, extra: Dots([at([x0 + 2.5, -9, STAGE_TOP + 3]), at([x0 + 2.5, 9, STAGE_TOP + 3])], { size: 0.42 }) });
  }
}
// a wax seal: a puddle with a wavy edge, a raised border, a beaded ring, and one pip per capability it grants
const waxRing = (x, r, seed) => Array.from({ length: 96 }, (_, i) => {
  const t = (i / 96) * Math.PI * 2;
  const rr = r * (1 + 0.022 * Math.sin(6 * t + seed) + 0.035 * Math.sin(2 * t + 2 * seed)); // stays convex: sum of a·n² < 1
  return [x + rr * Math.cos(t), rr * Math.sin(t)];
});
function sealDevice(x, r, marks, lit) {
  const z = SEAL_TOP;
  const border = r * 0.8;
  const field = r * 0.62;
  const beads = Math.round((Math.PI * 2 * r * 0.71) / 2.1);
  const beadPts = Array.from({ length: beads }, (_, i) => {
    const a = (i / beads) * Math.PI * 2;
    return at([x + Math.cos(a) * r * 0.71, Math.sin(a) * r * 0.71, z]);
  });
  const pips = Array.from({ length: marks }, (_, i) => {
    const a = (i / marks) * Math.PI * 2 - Math.PI / 2;
    const rr = marks === 1 ? 0 : r * 0.3;
    return at([x + Math.cos(a) * rr, Math.sin(a) * rr, z]);
  });
  return (
    `<path class="iso-line" data-role="border" data-tone="${lit ? "lit" : "mid"}" d="${k.ring(x, 0, border, z, P, 64)}"/>` +
    Ln(k.ring(x, 0, field, z, P, 56), { tone: "lo" }) +
    Dots(beadPts, { size: 0.42, tone: "lo" }) +
    Dots(pips, { size: Math.max(1, r * 0.075), tone: lit ? "hi" : "mid" }).replace('class="iso-dots"', 'class="iso-dots" data-role="pips"')
  );
}
const REST_SEAL = 1;
M.SEALS.forEach((seal, i) => {
  const x = X[i];
  const ring = waxRing(x, seal.r, 1.3 + i * 2.1);
  const device = sealDevice(x, seal.r, seal.marks, i === REST_SEAL);
  const solid = S(k.extrude(ring, RIBBON_TOP, SEAL_H, P, { convex: true, bevel: 0.5 }), { tone: "hi", crease: "lo", lit: i === REST_SEAL, inner: Ln(k.ringSeam(ring, RIBBON_TOP + 1.2, P), { tone: "faint" }) });
  const svg = `<g data-part="seal-${i + 1}">${solid}${i === 2 ? `<g data-part="seal-3-device">${device}</g>` : device}</g>`;
  const shape = rec(A.extruded(ring, RIBBON_TOP, SEAL_H, { name: `seal.${seal.id}` }));
  put(`seal.${seal.id}`, [x, 0, RIBBON_TOP + SEAL_H / 2], svg, [shape]);
});

// ---- rails, end stops and the ruler for the comparator carriage ----
for (const c of [-RAIL_Y, RAIL_Y]) {
  const rail = { x: -100, y: c - 2, w: 182, d: 4, r: 0.6 };
  box(`rail${c}`, rail, 0, 4, { tone: "mid" }, { steps: 2, bevel: 0.3, extra: Dots([-92, -36, 20, 76].map((x) => at([x, c, 4])), { size: 0.4 }) });
  for (const x0 of [-105, 82]) box(`rail${c}.stop${x0}`, { x: x0, y: c - 4, w: 5, d: 8, r: 1 }, 0, 8, { tone: "mid" }, { steps: 2, bevel: 0.4, extra: Dots([at([x0 + 2.5, c, 8])], { size: 0.42 }) });
}
const STRIP = { x: -96, y: 54, w: 160, d: 6, r: 1 };
{
  const ticks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 5, STRIP.y, 0.6, [1.6, 3.2], P);
  box("ruler", STRIP, 0, 0.6, { tone: "lo", crease: "none" }, { steps: 2, bevel: 0, extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) });
}

// ---- the comparator gantry: two carriages, two posts, a bridge, a stem and the loupe ----
const GX = X[0];
const GMOVE = [X[2] - X[0], 0, 0];
const gopt = { piece: "gantry", move: GMOVE, part: "gantry" };
for (const c of [-RAIL_Y, RAIL_Y]) {
  const car = { x: GX - 9, y: c - 4.5, w: 18, d: 9, r: 1.2 };
  box(`gantry.carriage${c}`, car, 4, 7, { tone: "mid" }, { bevel: 0.5, ...gopt, extra: Dots([at([car.x + 2.2, c - 2.6, 11]), at([car.x + 2.2, c + 2.6, 11]), at([car.x + car.w - 2.2, c - 2.6, 11]), at([car.x + car.w - 2.2, c + 2.6, 11])], { size: 0.42 }) });
  const p = { x: GX - 3.5, y: c - 3.5, w: 7, d: 7, r: 1.2 };
  box(`gantry.post${c}`, p, 11, BRIDGE_Z - 11, { tone: "mid" }, { bevel: 0.4, ...gopt, inner: Ln(k.sideSeam(p, 25, P, 3), { tone: "faint" }) });
}
box("gantry.lock", { x: GX + 4.6, y: RAIL_Y - 1.6, w: 3.2, d: 3.2, r: 0.8 }, 11, 1.4, { tone: "mid" }, { steps: 2, bevel: 0, ...gopt });
post("gantry.lockknob", GX + 6.2, RAIL_Y, 2.4, 12.4, 3.6, { tone: "mid" }, { steps: 20, ...gopt, extra: Ln(k.knurl(GX + 6.2, RAIL_Y, 2.4, 12.4, 16, 18, P), { tone: "lo" }) + Dots([at([GX + 6.2, RAIL_Y, 16])], { size: 0.4 }) });
{
  const index = { x: GX - 1, y: RAIL_Y + 4.5, w: 2, d: 3.5, r: 0.3 };
  box("gantry.index", index, 1.4, 8.6, { tone: "mid" }, { steps: 2, bevel: 0, ...gopt, extra: Ln(k.segment([GX, RAIL_Y + 8, 1.4], [GX, RAIL_Y + 8, 10], P), { tone: "hi" }) });
}
const BRIDGE = { x: GX - 5, y: -RAIL_Y - 4, w: 10, d: 2 * RAIL_Y + 8, r: 2 };
box("gantry.bridge", BRIDGE, BRIDGE_Z, 6, { tone: "mid" }, { steps: 4, bevel: 0.6, ...gopt, extra: Dots([-RAIL_Y, RAIL_Y].map((c) => at([GX, c, BRIDGE_Z + 6])), { size: 0.45 }) });
box("gantry.stem", { x: GX - 2, y: -LOUPE.rOut - 4, w: 4, d: 4, r: 0.6 }, LOUPE.z0, BRIDGE_Z - LOUPE.z0, { tone: "mid" }, { steps: 2, bevel: 0, ...gopt });
// the loupe: a flat ring with the lens set flush in its top face, drawn open so the seal shows through it
{
  const [cA, sA] = [Math.cos((AZ * Math.PI) / 180), Math.sin((AZ * Math.PI) / 180)];
  const face = Math.atan2(sA, cA); // the direction the visible half faces
  const { z0, z1, rIn, rOut } = LOUPE;
  const frontOut = ellipse(GX, 0, rOut, z1, face - Math.PI / 2, face + Math.PI / 2);
  const frontOutLow = ellipse(GX, 0, rOut, z0, face - Math.PI / 2, face + Math.PI / 2);
  const backOut = ellipse(GX, 0, rOut, z1, face + Math.PI / 2, face + (3 * Math.PI) / 2);
  const backIn = ellipse(GX, 0, rIn, z1, face + Math.PI / 2, face + (3 * Math.PI) / 2);
  const backInLow = ellipse(GX, 0, rIn, z0, face + Math.PI / 2, face + (3 * Math.PI) / 2);
  const innerTop = ellipse(GX, 0, rIn, z1, 0, Math.PI * 2, 72);
  const outerTop = ellipse(GX, 0, rOut, z1, 0, Math.PI * 2, 72);
  const innerWall = pathPts([...backIn, ...[...backInLow].reverse()], true);
  const outerWall = pathPts([...frontOut, ...[...frontOutLow].reverse()], true);
  const annulus = pathPts(outerTop, true) + pathPts([...innerTop].reverse(), true);
  const edge = pathPts(backOut) + pathPts(frontOutLow) + pathPts([frontOut[0], frontOutLow[0]]) + pathPts([frontOut[frontOut.length - 1], frontOutLow[frontOutLow.length - 1]]) + pathPts(innerTop, true) + pathPts(backInLow);
  // a glint on the lens: two chords near the far rim, each ending on the rim
  const chord = (a0, a1) => k.lineOnTop([GX + rIn * Math.cos(a0), rIn * Math.sin(a0)], [GX + rIn * Math.cos(a1), rIn * Math.sin(a1)], z1, P);
  const glint = chord(face + 2.35, face + 3.05) + chord(face + 2.2, face + 3.35);
  const svg =
    `<g class="iso-solid"><path class="iso-shade" data-shade="1" d="${innerWall}"/><path class="iso-fill" d="${pathPts(frontOut.concat([...frontOutLow].reverse()), true)}"/>` +
    `<path class="iso-top" fill-rule="evenodd" d="${annulus}"/><path class="iso-shade" data-shade="2" d="${outerWall}"/>` +
    `<path class="iso-line iso-crease" data-tone="faint" d="${pathPts(frontOut)}"/>${Ln(glint, { tone: "faint" })}<path class="iso-line iso-edge" data-tone="mid" d="${edge}"/></g>` +
    Dots([at([GX, -rOut + 1.2, z1])], { size: 0.4 });
  const Fz = G.frameOf([GX, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const shape = rec(A.ring(Fz, z0, z1, rIn, rOut, { name: "gantry.loupe" }));
  put("gantry.loupe", [GX, 0, (z0 + z1) / 2], svg, [shape], gopt);
}

// ---- the signet press: a C-frame with a gland, a ram that carries the signet die, and a handwheel ----
{
  const foot = { x: PX - 10, y: -67, w: 20, d: 17, r: 2 };
  box("press.foot", foot, 0, 3, { tone: "mid" }, { steps: 4, bevel: 0.5, extra: Dots(k.corners(foot, 2.4).map(([x, y]) => at([x, y, 3])), { size: 0.45 }) });
  const col = { x: PX - 7, y: -64, w: 14, d: 12, r: 2 };
  box("press.column", col, 3, ARM_Z - 3, { tone: "mid" }, { steps: 3, bevel: 0.5, inner: Ln(k.sideSeam(col, 20, P, 3), { tone: "faint" }) });
  const arm = { x: PX - 7, y: -64, w: 14, d: 76, r: 2.5 };
  box("press.arm", arm, ARM_Z, 10, { tone: "mid" }, { steps: 4, bevel: 0.6, inner: Ln(k.sideSeam(arm, ARM_Z + 5, P, 4), { tone: "faint" }), extra: Dots([at([PX, -58, ARM_Z + 10]), at([PX, -46, ARM_Z + 10])], { size: 0.45 }) });
  post("press.gland", PX, 0, 7, GLAND_Z, ARM_Z - GLAND_Z, { tone: "mid" }, { steps: 32, inner: Ln(k.sideArc(PX, 0, 7, GLAND_Z + 3, P, 24), { tone: "faint" }) });
  post("press.housing", PX, 0, 5, ARM_Z + 10, WHEEL.z - ARM_Z - 10, { tone: "mid" }, { steps: 24, inner: Ln(k.sideArc(PX, 0, 5, ARM_Z + 13, P, 18), { tone: "faint" }) });
  // the handwheel, its spokes and the knob that turns with it
  const spokes = (angle) =>
    [0, 1, 2]
      .map((i) => {
        const a = angle + (i / 3) * Math.PI * 2;
        return k.lineOnTop([PX + Math.sin(a) * WHEEL.hub, -Math.cos(a) * WHEEL.hub], [PX + Math.sin(a) * WHEEL.rim, -Math.cos(a) * WHEEL.rim], WHEEL.z + WHEEL.h, P);
      })
      .join("");
  const wheelFace = Ln(k.ring(PX, 0, WHEEL.rim, WHEEL.z + WHEEL.h, P, 48) + k.ring(PX, 0, WHEEL.hub, WHEEL.z + WHEEL.h, P, 20), { tone: "lo" }) + `<path class="iso-line" data-tone="mid" data-part="wheel-spokes" d="${spokes(0)}"/>`;
  post("press.wheel", PX, 0, WHEEL.r, WHEEL.z, WHEEL.h, { tone: "mid" }, { steps: 48, bevel: 0.4, extra: Ln(k.knurl(PX, 0, WHEEL.r, WHEEL.z, WHEEL.z + WHEEL.h, 60, P, 0.3), { tone: "lo" }) + wheelFace });
  const kx = PX + Math.sin(0.6) * WHEEL.knob;
  const ky = -Math.cos(0.6) * WHEEL.knob;
  post("press.knob", kx, ky, WHEEL.kr, WHEEL.z + WHEEL.h, WHEEL.kh, { tone: "mid" }, { steps: 18, wrap: (svg) => `<g data-part="wheel-knob">${svg}</g>` });
  // the ram: one rod out of the gland, clipped at the gland face, and the signet die on its end
  const F = G.frameOf([PX, 0, GLAND_Z], [0, 0, -1], [1, 0, 0], [0, -1, 0]);
  const rod = G.rodOut(F, 0, ROD_LEN, ROD_R, P, { stroke: STROKE });
  const die = G.disc(ROD_LEN, ROD_LEN + DIE.h, DIE.r, F, P, { bevel: 0.4 });
  const svg =
    `<clipPath id="pact-ram-clip"><path data-hold d="${rod.clip}"/></clipPath><g clip-path="url(#pact-ram-clip)">${S(rod.paths, { tone: "mid" })}</g>` +
    S(die, { tone: "mid", inner: Ln(G.arcOf(F, ROD_LEN + 0.9, DIE.r, P), { tone: "faint" }) });
  const shapes = [rec(A.slide(F, 0, ROD_LEN, ROD_R, { name: "press.ram" })), rec(A.disc(F, ROD_LEN, ROD_LEN + DIE.h, DIE.r, { name: "press.die" }))];
  put("press.ram", [PX, 0, GLAND_Z - ROD_LEN / 2 - 2], svg, shapes, { piece: "ram", move: [0, 0, -STROKE], part: "ram" });
}

// ---- settle the painter's order over every pose ----
const G2 = (X[1] - X[0]) / (X[2] - X[0]);
const ST = (label, gantry, ram) => ({ label, shares: { gantry, ram } });
const STATES = [ST("seal 1", 0, 0), ST("pressing", 0, 1), ST("seal 2", G2, 0), ST("seal 3", 1, 0), ST("between 1 and 2", G2 / 2, 0), ST("between 2 and 3", (1 + G2) / 2, 0), ST("half press", 0, 0.5)];
A.settle(R, P, { states: STATES });
R.items.sort((a, b) => a.key - b.key);

const REST = { gantry: G2, ram: 0 };
const groups = R.items.map((item) => {
  if (!item.part || !item.piece) return item.svg;
  const share = REST[item.piece] ?? 0;
  const tr = share ? ` transform="${k.translateAlong(P, G.mul3(item.move, share))}"` : "";
  return `<g data-part="${item.part}"${tr}>${item.svg}</g>`;
});

const LABEL_TEXT =
  "A notary's bench. A screw press with a signet die stands over the last of three wax seals on a ribbon; the seals belong to the human, the agent and the request, each narrower than the one before. A loupe on a carriage walks the chain seal by seal on the same plate, and no cable leaves it.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: [...back, ...groups] });
writeFileSync(join(SRC, "pact.svg"), svg);

// ---- the live module ----
const DATA = {
  P,
  X,
  GX,
  STROKE,
  PX,
  WHEEL,
  REST_SEAL,
  TURNS: 2,
  seals: M.SEALS.map((s) => s.say),
  say: { sign: M.SAY.sign, done: M.SAY.done, walk: M.SAY.walk(9).replace("9", "{n}") },
  tour: M.TOUR,
  tourLength: M.TOUR_LENGTH,
};

const LIVE = `// Generated by www/figures/pact/build.mjs. Do not edit by hand.
import { lineOnTop, cylinder, translateAlong, holdStill, axisVector } from "../../vendor/anatomy/kit/iso-kit.mjs";

const D = ${JSON.stringify(DATA)};

export function mount(root, { mode = "hover" } = {}) {
  const svg = root.querySelector("svg");
  if (!svg) return { destroy() {} };
  const all = (name) => [...svg.querySelectorAll('[data-part="' + name + '"]')];
  const gantry = all("gantry"), ram = all("ram");
  const seals = [1, 2, 3].map((n) => svg.querySelector('[data-part="seal-' + n + '"] > .iso-solid'));
  const device = svg.querySelector('[data-part="seal-3-device"]');
  const borders = [1, 2, 3].map((n) => svg.querySelector('[data-part="seal-' + n + '"] [data-role="border"]'));
  const pips = [1, 2, 3].map((n) => svg.querySelector('[data-part="seal-' + n + '"] [data-role="pips"]'));
  const spokes = svg.querySelector('[data-part="wheel-spokes"]');
  const knob = svg.querySelector('[data-part="wheel-knob"] .iso-solid');
  const readout = root.querySelector("[data-readout]") || (root.closest(".iso-plate") ? root.closest(".iso-plate").querySelector("[data-readout]") : null);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const P = D.P, X = D.X, W = D.WHEEL;

  const g = { x: X[D.REST_SEAL], v: 0, target: X[D.REST_SEAL] };
  const r = { x: 0, v: 0, target: 0 };
  const dev = { x: 1, target: 1 };
  let lit = D.REST_SEAL, latched = true, clock = 0, playing = false, done = false, frame = 0, last = 0, visible = false, resume = 0;

  const tourAt = (t) => { let step = D.tour[0]; for (const s of D.tour) if (t >= s.at) step = s; return step; };
  const settleTo = (s, dt, seconds) => {
    const w = 1 / seconds;
    for (let i = 0; i < 4; i++) { s.v += (w * w * (s.target - s.x) - 2 * w * s.v) * (dt / 4); s.x += s.v * (dt / 4); }
    if (Math.abs(s.target - s.x) < 1e-3 && Math.abs(s.v) < 1e-3) { s.x = s.target; s.v = 0; return false; }
    return true;
  };
  function spokesAt(angle) {
    let d = "";
    for (let i = 0; i < 3; i++) {
      const a = angle + (i / 3) * Math.PI * 2;
      d += lineOnTop([D.PX + Math.sin(a) * W.hub, -Math.cos(a) * W.hub], [D.PX + Math.sin(a) * W.rim, -Math.cos(a) * W.rim], W.z + W.h, P);
    }
    return d;
  }
  function setKnob(angle) {
    const a = 0.6 + angle;
    const p = cylinder(D.PX + Math.sin(a) * W.knob, -Math.cos(a) * W.knob, W.kr, W.z + W.h, W.kh, P, 18);
    knob.querySelector(".iso-fill").setAttribute("d", p.fill);
    knob.querySelectorAll(".iso-shade").forEach((el) => el.setAttribute("d", p.shades[Number(el.dataset.shade)] || ""));
    knob.querySelector(".iso-top").setAttribute("d", p.top);
    const crease = knob.querySelector(".iso-crease"); if (crease) crease.setAttribute("d", p.crease);
    knob.querySelector(".iso-edge").setAttribute("d", p.outline);
  }
  function say() {
    if (!readout) return;
    let text;
    if (r.x > 0.03) text = D.say.sign;
    else if (done) text = D.say.done;
    else {
      const near = X.findIndex((x) => Math.abs(g.x - x) < 1.2);
      if (near >= 0) text = D.seals[near];
      else {
        const ahead = g.v >= 0 ? X.findIndex((x) => x > g.x) : X.length - 1 - [...X].reverse().findIndex((x) => x < g.x);
        text = D.say.walk.replace("{n}", String(ahead + 1));
      }
    }
    if (readout.textContent !== text) readout.textContent = text;
  }
  function draw() {
    const share = (g.x - D.GX) / (X[2] - X[0]);
    const tg = translateAlong(P, [g.x - D.GX, 0, 0]);
    gantry.forEach((el) => el.setAttribute("transform", tg));
    const off = axisVector(P, [0, 0, -D.STROKE * r.x]);
    ram.forEach((el) => { el.setAttribute("transform", "translate(" + off[0].toFixed(3) + " " + off[1].toFixed(3) + ")"); holdStill(el, off); });
    const angle = r.x * D.TURNS * Math.PI * 2;
    spokes.setAttribute("d", spokesAt(angle));
    setKnob(angle);
    device.setAttribute("opacity", dev.x.toFixed(3));
    let best = 0;
    X.forEach((x, i) => { if (Math.abs(g.x - x) < Math.abs(g.x - X[best])) best = i; });
    if (best !== lit) {
      seals[lit].removeAttribute("data-lit"); seals[best].setAttribute("data-lit", "");
      borders[lit].setAttribute("data-tone", "mid"); borders[best].setAttribute("data-tone", "lit");
      pips[lit].setAttribute("data-tone", "mid"); pips[best].setAttribute("data-tone", "hi");
      lit = best;
    }
    say();
    return share;
  }
  function step(dt) {
    if (playing) {
      const before = clock;
      clock += dt;
      if (clock >= D.tourLength) clock -= D.tourLength;
      if (clock < before) latched = false;
      const s = tourAt(clock);
      g.target = X[s.seal];
      r.target = s.ram;
      done = !!s.done;
      if (s.device === 0 && !latched) dev.target = 0;
    }
    let moving = settleTo(g, dt, 0.32);
    moving = settleTo(r, dt, 0.22) || moving;
    if (r.x > 0.97 && !latched) { latched = true; dev.target = 1; }
    const rate = dev.target > dev.x ? 0.08 : 0.35;
    dev.x += (dev.target - dev.x) * (1 - Math.exp(-dt / rate));
    if (Math.abs(dev.target - dev.x) < 1e-3) dev.x = dev.target; else moving = true;
    return moving;
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const moving = step(dt);
    draw();
    frame = visible && !still.matches && (playing || moving) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" });
  io.observe(root);

  const play = (from = 0) => { playing = true; clock = from; latched = false; run(); };
  const rest = () => { playing = false; done = false; g.target = X[D.REST_SEAL]; r.target = 0; dev.target = 1; latched = true; run(); };
  const steer = (seal) => {
    playing = false; done = false; r.target = 0; dev.target = 1; latched = true; g.target = X[seal];
    clearTimeout(resume);
    if (mode === "tour") resume = setTimeout(() => play(0), 3600);
    run();
  };
  const onMove = (event) => {
    const box = svg.getBoundingClientRect();
    const f = (event.clientX - box.left) / box.width;
    steer(f < 0.42 ? 0 : f < 0.58 ? 1 : 2);
  };
  const onKey = (event) => {
    const here = X.reduce((best, x, i) => (Math.abs(g.target - x) < Math.abs(g.target - X[best]) ? i : best), 0);
    if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(Math.min(2, here + 1));
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(Math.max(0, here - 1));
    else if (event.key === "Home") steer(0);
    else if (event.key === "End") steer(2);
    else if (event.key === " " || event.key === "Enter") { clearTimeout(resume); play(0); }
    else return;
    event.preventDefault();
  };
  const enter = () => play(0);
  const leave = () => rest();
  if (mode === "tour") {
    resume = setTimeout(() => play(0), 1000);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("keydown", onKey);
  } else {
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
  }
  draw();
  return {
    destroy() {
      cancelAnimationFrame(frame); frame = 0; clearTimeout(resume); io.disconnect();
      root.removeEventListener("pointermove", onMove); root.removeEventListener("keydown", onKey);
      root.removeEventListener("pointerenter", enter); root.removeEventListener("pointerleave", leave);
    },
  };
}
`;
writeFileSync(join(SRC, "pact.live.js"), LIVE);

// ---- previews ----
const inline = LIVE.replace(/^import .*$/m, "").replace(/^export /gm, "") + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
const plate = k.plateHtml({
  fig: "Fig",
  title: "Pact",
  hint: "Hover to move the loupe · space to sign",
  readout: M.SEALS[REST_SEAL].say,
  keys: [
    { mark: "lit", label: "The seal under the loupe: the link being checked" },
    { mark: "raised", label: "Three wax seals, human, agent and request, each narrower than the last" },
  ],
  caption:
    "A notary's bench. The human's seal carries the full device, the agent's seal the two capabilities the human delegated, and the request's seal the one it uses, so no link can be wider than the one before it. The press signs each request with the agent's signet; then the loupe walks the chain from the human's seal to the request and checks every seal on this plate. Verifying needs 0 network calls and 0 third-party dependencies, and protecting a route takes 1 line of middleware.",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Pact notary bench. Arrow keys move the loupe from seal to seal; Space signs a new request and walks the chain.">${svg}</div>`,
});
for (const theme of ["light", "dark"]) {
  writeFileSync(join(HERE, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "Pact", theme, body: plate, script: kitScript() + inline }));
}
console.log(`wrote pact.svg, pact.live.js, previews · ${R.items.length} items · ${R.solids.length} solids · stroke ${STROKE.toFixed(1)} · ${(svg.length / 1024).toFixed(0)} KB svg`);

A.auditOrExit(R, P, { frames: STATES });
