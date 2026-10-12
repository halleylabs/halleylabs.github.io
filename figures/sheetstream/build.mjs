// sheetstream: a sheet feeder. Ledger sheets leave a tall stack in small packets, pass a pair of rollers and land on a
// second stack, while a memory gauge on the head holds near its low mark. `node build.mjs` writes every output.
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
const BASE = { x: -114, y: -62, w: 228, d: 132, r: 8 };
const BASE_H = 10;
const FOOT_H = 5;
const F = 62; // feed line: the top of the source stack, the top of every packet
const N = M.PACKETS;
const T = 40 / N; // one packet
const PITCH = 74; // from the source stack to the sink stack
const S_IN = { x: -66, y: -36, w: 58, d: 72, r: 0.6 };
const S_OUT = { x: S_IN.x + PITCH, y: -36, w: 58, d: 72, r: 0.6 };
const P_IN = { x: -70, y: -38, w: 64, d: 76, r: 2 };
const P_OUT = { x: 6, y: -38, w: 64, d: 76, r: 2 };
const PLATE_T = 2;
const N_IN0 = 4;
const N_OUT0 = 3;
const Z_IN0 = F - T - N_IN0 * T; // plate tops at rest: a packet in flight, source top at F - T
const Z_OUT0 = F - T - N_OUT0 * T;
const COL_TOP = 72;
const UP_TOP = 80;
const BEAM_TOP = 84;
const R_ROLL = 5;
const Z_UP = F + R_ROLL; // upper roller axis
const Z_LO = F - T - R_ROLL; // lower roller axis
const R_GEAR = (Z_UP - Z_LO) / 2;
const DIAL = { x: 0, y: -32, r: 17, z: 88, h: 8 };
const DIAL_TOP = DIAL.z + DIAL.h;

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [-83, 0, 88], [83, 0, 88], [0, DIAL.y, DIAL_TOP + 1], [-DIAL.r, DIAL.y - DIAL.r, DIAL_TOP], [DIAL.r, DIAL.y + DIAL.r, DIAL_TOP]],
  W,
  H,
  { pad: 22, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const f2 = (v) => Math.round(v * 100) / 100;

// ---- recorder helpers: every drawn item records its true shape ----
const R = A.recorder(P);
const rec = R.solid;
function put(name, ref, svg, shapes, { bias = 0, piece = "", move, part } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece, ...(move ? { move } : {}), part });
}
function box(name, plan, z, h, style = {}, { steps = 3, bevel = 0.5, inner = "", extra = "", bias = 0, piece, move, part, ground } = {}) {
  const shape = rec(A.slab(plan, z, h, { name, ...(ground ? { ground: true } : {}) }, steps));
  const svg = S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra;
  return put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg, [shape], { bias, piece, move, part });
}
function post(name, cx, cy, r, z, h, style = {}, { steps = 28, bevel = 0, inner = "", extra = "", bias = 0, piece, move, part } = {}) {
  const shape = rec(A.cylinder(cx, cy, r, z, h, { name }));
  const svg = S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra;
  return put(name, [cx, cy, z + h / 2], svg, [shape], { bias, piece, move, part });
}
function disc(name, Fr, s0, s1, r, style = {}, { inner = "", extra = "", bias = 0, bevel = 0, part } = {}) {
  const shape = rec(A.disc(Fr, s0, s1, r, { name }));
  const svg = S(G.disc(s0, s1, r, Fr, P, { bevel }), { tone: "mid", ...style, inner }) + extra;
  return put(name, G.add3(Fr.o, G.mul3(Fr.a, (s0 + s1) / 2)), svg, [shape], { bias, part });
}

// ---- turning texture shared with the live module ----
function ribsFor(def, phase, P, V, iso) {
  const out = [];
  for (let i = 0; i < def.count; i++) {
    const t = def.dir * phase + (i / def.count) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const rad = [def.u[0] * c + def.v[0] * s, def.u[1] * c + def.v[1] * s, def.u[2] * c + def.v[2] * s];
    const facing = rad[0] * V[0] + rad[1] * V[1] + rad[2] * V[2];
    const x = Math.min(1, Math.max(0, (facing - 0.1) / 0.45));
    const alpha = x * x * (3 - 2 * x);
    if (alpha < 0.02) {
      out.push(["", 0]);
      continue;
    }
    const p = (sv) => iso([def.o[0] + def.a[0] * sv + rad[0] * def.r, def.o[1] + def.a[1] * sv + rad[1] * def.r, def.o[2] + def.a[2] * sv + rad[2] * def.r], P);
    const a = p(def.s0);
    const b = p(def.s1);
    out.push([`M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`, Math.round(alpha * 100) / 100]);
  }
  return out;
}
const ribsMarkup = (def, phase) => ribsFor(def, phase, P, V, k.iso).map(([d, a]) => `<path class="iso-line" data-tone="${def.tone}" d="${d}" opacity="${a}"/>`).join("");

// ---- the stacks: one slab per stack, sheet seams at every packet, ledger rules on top ----
function stackParts(plan, z0, n) {
  const h = n * T;
  const slab = k.slabOf(plan, z0, Math.max(h, 0.01), P, 2);
  const seams = [];
  for (let j = 1; j < n; j++) seams.push(k.sideSeam(plan, z0 + j * T, P, 2));
  const top = z0 + h;
  const rules = [];
  for (let j = 1; j < 12; j++) rules.push(k.lineOnTop([plan.x, plan.y + j * 6], [plan.x + plan.w, plan.y + j * 6], top, P));
  const margin = k.lineOnTop([plan.x + 9, plan.y], [plan.x + 9, plan.y + plan.d], top, P);
  return { slab, seams: seams.join(""), rules: rules.join(""), margin };
}
function stackSvg(plan, z0, n) {
  const s = stackParts(plan, z0, n);
  return (
    S(s.slab, { tone: "hi", crease: "lo", inner: `<path class="iso-line" data-tone="faint" data-role="seams" d="${s.seams}"/>` }) +
    `<path class="iso-line" data-tone="faint" data-role="rules" d="${s.rules}"/><path class="iso-line" data-tone="lo" data-role="margin" d="${s.margin}"/>`
  );
}

// ---- base ----
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(BASE, 22))) {
  back.push(S(k.cylinder(x, y, 7, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "lo" }));
  rec(A.cylinder(x, y, 7, -BASE_H - FOOT_H, 1.6, { name: "stand.foot.flange", ground: true }));
  rec(A.cylinder(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, { name: "stand.foot", ground: true }));
}
back.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6), { tone: "lo", inner: Ln(k.sideSeam(BASE, -4, P, 8), { tone: "faint" }) }));
rec(A.slab(BASE, -BASE_H, BASE_H, { name: "stand.plate", ground: true }, 8));
back.push(Ln(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }));
const baseScrews = k.corners(BASE, 10);
back.push(Ln(baseScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(baseScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

// label plate and ruler on the near edge
const LABEL = { x: -100, y: 46, w: 36, d: 13, r: 1.2 };
box("stand.label", LABEL, 0, 0.8, { tone: "lo", crease: "none" }, {
  steps: 3,
  bevel: 0,
  extra:
    Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 3), { tone: "faint" }) +
    Ln([0, 1, 2].map((row) => k.lineOnTop([LABEL.x + 7, LABEL.y + 4 + row * 2.4], [LABEL.x + (row === 1 ? 22 : 29), LABEL.y + 4 + row * 2.4], 0.8, P)).join(""), { tone: "lo", free: true }) +
    Dots([at([LABEL.x + 3.2, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3.2, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.45 }),
});
const STRIP = { x: -52, y: 56, w: 140, d: 6, r: 1 };
{
  const ticks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 5, STRIP.y, 0.6, [1.8, 3.4], P);
  box("stand.ruler", STRIP, 0, 0.6, { tone: "lo", crease: "none" }, {
    steps: 3,
    bevel: 0,
    extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) + Dots([at([STRIP.x + 2, STRIP.y + 3, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3, 0.6])], { size: 0.45 }),
  });
}

// ---- the two lifts: columns with guide rails, a crossbar and lift motor, a carriage plate that rides the rails ----
function lift(side) {
  const sgn = side === "in" ? -1 : 1;
  const name = `lift.${side}`;
  const colX = sgn < 0 ? -86 : 80;
    const blockX = sgn < 0 ? -84 : 70;
  const plate = sgn < 0 ? P_IN : P_OUT;
  const z0 = sgn < 0 ? Z_IN0 : Z_OUT0;
  const piece = sgn < 0 ? "liftIn" : "liftOut";
  const part = `lift-${side}`;
  const move = [0, 0, T];
  for (const c of [-24, 24]) {
    const foot = { x: colX - 3, y: c - 6.5, w: 12, d: 13, r: 1.5 };
    box(`${name}.foot${c}`, foot, 0, 2, { tone: "mid" }, { bevel: 0.4, extra: Dots([at([foot.x + 2, foot.y + 2, 2]), at([foot.x + 2, foot.y + foot.d - 2, 2]), at([foot.x + foot.w - 2, foot.y + 2, 2]), at([foot.x + foot.w - 2, foot.y + foot.d - 2, 2])], { size: 0.42 }) });
    const col = { x: colX, y: c - 3.5, w: 6, d: 7, r: 1 };
    box(`${name}.column${c}`, col, 2, COL_TOP - 2, { tone: "mid" }, { bevel: 0.4, inner: Ln([20, 46].map((z) => k.sideSeam(col, z, P, 3)).join(""), { tone: "faint" }) });
    const rail = { x: colX + 1.5, y: c + 3.5, w: 3, d: 1.2, r: 0.3 };
    box(`${name}.rail${c}`, rail, 6, COL_TOP - 10, { tone: "mid" }, { steps: 2, bevel: 0 });
    const block = { x: blockX, y: c + 4.7, w: 14, d: 7, r: 1 };
    box(`${name}.block${c}`, block, z0 - 8, 8, { tone: "mid" }, {
      bevel: 0.4,
      piece,
      move,
      part,
      extra: Dots([at([block.x + 3, c + 8.2, z0]), at([block.x + block.w - 3, c + 8.2, z0])], { size: 0.42 }),
    });
  }
  const bar = { x: colX, y: -27.5, w: 6, d: 55, r: 1 };
  box(`${name}.crossbar`, bar, COL_TOP, 4, { tone: "mid" }, { bevel: 0.5, extra: Dots([-24, 24].map((c) => at([colX + 3, c, COL_TOP + 4])), { size: 0.45 }) });
  const mx = colX + 3;
  post(`${name}.motor`, mx, 0, 4.4, COL_TOP + 4, 9, { tone: "mid" }, { inner: Ln([COL_TOP + 7, COL_TOP + 10].map((z) => k.sideArc(mx, 0, 4.4, z, P, 18)).join(""), { tone: "faint" }) });
  post(`${name}.cap`, mx, 0, 3.4, COL_TOP + 13, 3, { tone: "mid" }, {
    extra: Ln(k.knurl(mx, 0, 3.4, COL_TOP + 13, COL_TOP + 16, 22, P), { tone: "lo" }) + Dots([at([mx, 0, COL_TOP + 16])], { size: 0.45 }),
  });
  // the carriage plate
  const screws = k.corners(plate, 3.2);
  box(`${name}.plate`, plate, z0 - PLATE_T, PLATE_T, { tone: "mid" }, {
    steps: 4,
    bevel: 0.5,
    piece,
    move,
    part,
    extra: Dots(screws.map(([x, y]) => at([x, y, z0])), { size: 0.42 }),
  });
  // the stack on the plate
  const plan = sgn < 0 ? S_IN : S_OUT;
  const n = sgn < 0 ? N_IN0 : N_OUT0;
  const shape = rec(A.slab(plan, z0, n * T, { name: `${name}.stack` }, 2));
  put(`${name}.stack`, [plan.x + plan.w / 2, plan.y + plan.d / 2, z0 + (n * T) / 2], `<g data-part="stack-${side}">${stackSvg(plan, z0, n)}</g>`, [shape], { piece, move, part });
  // lower limit stops under the carriage plate: a pad and a rubber bumper each
  for (const bx of [plate.x + 10, plate.x + plate.w - 10]) {
    const pad = { x: bx - 4, y: 26, w: 8, d: 8, r: 1 };
    box(`${name}.stop${bx}`, pad, 0, 1.2, { tone: "mid" }, { steps: 2, bevel: 0.3, extra: Dots([at([pad.x + 1.6, pad.y + 1.6, 1.2]), at([pad.x + pad.w - 1.6, pad.y + pad.d - 1.6, 1.2])], { size: 0.38 }) });
    post(`${name}.bumper${bx}`, bx, 30, 2.4, 1.2, 4, { tone: "mid" }, { steps: 20, extra: Ln(k.ring(bx, 30, 1.4, 5.2, P, 16), { tone: "faint" }) });
  }
  // a side fence on the far side keeps the sheets square
  const footBar = { x: sgn < 0 ? plan.x - 2 : plan.x + 4, y: -46, w: plan.w - 2, d: 8, r: 1.2 };
  box(`${name}.fencefoot`, footBar, 0, 3, { tone: "mid" }, { bevel: 0.4, extra: Dots([footBar.x + 3, footBar.x + footBar.w - 3].map((x) => at([x, -44, 3])), { size: 0.42 }) });
  const fence = { x: plan.x + 2, y: -42, w: plan.w - 4, d: 2, r: 0.5 };
  const slot = (z) => {
    const ring = [
      [fence.x + 8, z - 1.6],
      [fence.x + fence.w - 8, z - 1.6],
      [fence.x + fence.w - 8, z + 1.6],
      [fence.x + 8, z + 1.6],
    ];
    return k.pathOf(ring.map(([x, zz]) => at([x, fence.y + fence.d, zz])), true);
  };
  box(`${name}.fence`, fence, 3, 63, { tone: "mid" }, { steps: 2, bevel: 0.3, extra: Ln(slot(20) + slot(44), { tone: "faint" }) });
}
lift("in");
lift("out");

// ---- the head: two uprights, a beam, the nip rollers, the gear pair and the drive motor ----
for (const y0 of [-50, 42]) {
  const foot = { x: -10, y: y0 - 2, w: 20, d: 12, r: 1.5 };
  box(`head.foot${y0}`, foot, 0, 2, { tone: "mid" }, { bevel: 0.4, extra: Dots([at([foot.x + 2.2, foot.y + 6, 2]), at([foot.x + foot.w - 2.2, foot.y + 6, 2])], { size: 0.45 }) });
  const up = { x: -7, y: y0, w: 14, d: 8, r: 1.5 };
  box(`head.upright${y0}`, up, 2, UP_TOP - 2, { tone: "mid" }, { bevel: 0.5, inner: Ln(k.sideSeam(up, 30, P, 3), { tone: "faint" }) });
}
const BEAM = { x: -4.5, y: -50, w: 9, d: 100, r: 1.5 };
box("head.beam", BEAM, UP_TOP, BEAM_TOP - UP_TOP, { tone: "mid" }, { steps: 4, bevel: 0.6, extra: Dots([-46, 46].map((y) => at([0, y, BEAM_TOP])), { size: 0.45 }) });

const yAxis = (z) => G.frameOf([0, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const ROLLS = [
  { part: "roller-upper", o: [0, 0, Z_UP], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], s0: -42, s1: 42, r: R_ROLL, count: 26, dir: 1, tone: "lo" },
  { part: "roller-lower", o: [0, 0, Z_LO], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], s0: -42, s1: 42, r: R_ROLL, count: 26, dir: -1, tone: "lo" },
  { part: "gear-upper", o: [0, 0, Z_UP], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], s0: 50, s1: 53, r: R_GEAR, count: 24, dir: 1, tone: "mid" },
  { part: "gear-lower", o: [0, 0, Z_LO], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], s0: 50, s1: 53, r: R_GEAR, count: 24, dir: -1, tone: "mid" },
];
for (const def of ROLLS.slice(0, 2)) disc(`head.${def.part}`, yAxis(def.o[2]), def.s0, def.s1, def.r, { tone: "mid" }, { inner: `<g data-part="${def.part}">${ribsMarkup(def, 0)}</g>` });
for (const def of ROLLS.slice(2)) {
  const Fr = yAxis(def.o[2]);
  disc(`head.${def.part}`, Fr, def.s0, def.s1, def.r, { tone: "mid" }, { bevel: 0.3, inner: `<g data-part="${def.part}">${ribsMarkup(def, 0)}</g>` });
  disc(`head.${def.part}.hub`, Fr, def.s1, def.s1 + 1.6, 2.4, { tone: "mid" }, { extra: Ln(G.circleOf(Fr, def.s1 + 1.6, 1.2, P), { tone: "lo" }) + Dots([at([0, def.s1 + 1.6, def.o[2]])], { size: 0.45 }) });
}
// drive motor on the far upright, coaxial with the lower roller, and a bearing cap for the upper roller
{
  const Fm = yAxis(Z_LO);
  const fins = G.ribsOf(G.frameOf([0, 0, Z_LO], [0, -1, 0], [1, 0, 0], [0, 0, 1]), 52, 62, 6, 20, P, { fade: [0.1, 0.55], seams: true });
  disc("head.motor", Fm, -64, -50, 6, { tone: "mid" }, { inner: k.fadedSvg(fins, { tone: "lo" }) });
  disc("head.motor.cap", Fm, -66.5, -64, 4.6, { tone: "mid" }, { bevel: 0.3 });
  disc("head.bearing", yAxis(Z_UP), -53, -50, 3.6, { tone: "mid" }, { bevel: 0.3 });
}

// ---- the memory gauge on the beam ----
const NEEDLE = { tail: 3.4, tip: DIAL.r - 4.2 };
const needleAt = (share) => {
  const angle = Math.PI + share * M.DIAL_SWEEP;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  return k.lineOnTop([DIAL.x - s * NEEDLE.tail, DIAL.y + c * NEEDLE.tail], [DIAL.x + s * NEEDLE.tip, DIAL.y - c * NEEDLE.tip], DIAL_TOP + 0.2, P);
};
{
  const { x, y, r } = DIAL;
  post("gauge.boss", x, y, 3.5, BEAM_TOP, DIAL.z - BEAM_TOP, { tone: "mid" }, { steps: 20, inner: Ln(k.sideArc(x, y, 3.5, BEAM_TOP + 2, P, 12), { tone: "faint" }) });
  const ticks = k.radialTicks(x, y, r - 3, 50, 5, DIAL_TOP, [1.3, 2.8], P, Math.PI, M.DIAL_SWEEP);
  const zero = k.radialTicks(x, y, r - 3, 1, 1, DIAL_TOP, [3.2, 3.2], P, Math.PI, 0);
  const setAngle = Math.PI + M.dialShare(M.SET_POINTER_MB) * M.DIAL_SWEEP;
  const setPointer = k.lineOnTop([x + Math.sin(setAngle) * (r - 2.2), y - Math.cos(setAngle) * (r - 2.2)], [x + Math.sin(setAngle) * (r - 6.8), y - Math.cos(setAngle) * (r - 6.8)], DIAL_TOP + 0.1, P);
  const face =
    Ln(k.knurl(x, y, r, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }) +
    Ln(k.ring(x, y, r - 2.2, DIAL_TOP, P, 72), { tone: "lo" }) +
    Ln(ticks.minor, { tone: "lo" }) +
    Ln(ticks.major, { tone: "mid" }) +
    Ln(zero.major, { tone: "hi" }) +
    `<path class="iso-line" data-tone="mid" data-free="end" d="${setPointer}" style="stroke-width:1.3"/>` +
    k.faceTextSvg(k.topMatrix([x + 4.6, y + 4.6], DIAL_TOP, P, "x"), "MB", { size: 2.4, tone: "lo", anchor: "middle" }) +
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(M.dialShare(M.WRITE_MB))}" style="stroke-width:1.1"/>` +
    Ln(k.ring(x, y, 1.5, DIAL_TOP + 0.2, P, 16), { tone: "mid" }) +
    Dots([at([x, y, DIAL_TOP + 0.2])], { size: 0.55, tone: "hi" });
  const shape = rec(A.cylinder(x, y, r, DIAL.z, DIAL.h, { name: "gauge.dial" }));
  put("gauge.dial", [x, y, DIAL.z + DIAL.h / 2], S(k.cylinder(x, y, r, DIAL.z, DIAL.h, P, 64, 0.8), { tone: "hi", crease: "lo", inner: Ln(k.sideArc(x, y, r, DIAL_TOP - 3.4, P, 40), { tone: "faint" }) }) + face, [shape], { bias: 0.5 });
}

// ---- the packet in flight: a batch of ledger sheets ----
{
  const z0 = F - T;
  const seams = [1, 2].map((j) => k.sideSeam(S_IN, z0 + (j * T) / 3, P, 2)).join("");
  const rules = [];
  for (let j = 1; j < 12; j++) rules.push(k.lineOnTop([S_IN.x, S_IN.y + j * 6], [S_IN.x + S_IN.w, S_IN.y + j * 6], F, P));
  const svg =
    S(k.slabOf(S_IN, z0, T, P, 2), { tone: "hi", crease: "lo", inner: Ln(seams, { tone: "faint" }) }) +
    Ln(rules.join(""), { tone: "faint" }) +
    Ln(k.lineOnTop([S_IN.x + 9, S_IN.y], [S_IN.x + 9, S_IN.y + S_IN.d], F, P), { tone: "lo" });
  const shape = rec(A.slab(S_IN, z0, T, { name: "packet" }, 2));
  put("packet", [S_IN.x + S_IN.w / 2, 0, z0 + T / 2], svg, [shape], { piece: "packet", move: [PITCH, 0, 0], part: "packet", bias: 0.05 });
}

// ---- settle the painter's order over every pose the machine passes through ----
const ST = (label, packet, liftIn, liftOut) => ({ label, shares: { packet, liftIn, liftOut } });
const STATES = [ST("home", 0, 0, 0), ST("mid", 0.5, 0, 0), ST("landed", 1, 0, 0), ST("lifted", 1, 1, -1), ST("in low", 0, -3, 1), ST("in high out low", 1, 1, -5), ST("both low", 0.5, -3, -5), ST("out full", 1, 0.5, -5)];
A.settle(R, P, { states: STATES });
R.items.sort((a, b) => a.key - b.key);

const REST = { packet: 0.5, liftIn: 0, liftOut: 0 };
const groups = R.items.map((item) => {
  if (!item.part) return item.svg;
  const share = REST[item.piece] ?? 0;
  const off = G.mul3(item.move, share);
  const tr = share ? ` transform="${k.translateAlong(P, off)}"` : "";
  return `<g data-part="${item.part}"${tr}>${item.svg}</g>`;
});

const LABEL_TEXT =
  "A sheet feeder on a bench. Ledger sheets leave a tall stack in small packets, pass between a pair of rubber rollers and land on a second stack; each stack rides a lift so its top stays at the feed line. A memory gauge on the head reads 0 to 1,000 MB and holds near 82 MB while the stack drains.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: [...back, ...groups] });
writeFileSync(join(SRC, "sheetstream.svg"), svg);

// ---- the live module ----
const DATA = {
  P,
  V,
  F,
  T,
  N,
  PITCH,
  S_IN,
  S_OUT,
  Z_IN0,
  Z_OUT0,
  N_IN0,
  N_OUT0,
  R_ROLL,
  ROLLS: ROLLS.map(({ part, o, a, u, v, s0, s1, r, count, dir, tone }) => ({ part, o, a, u, v, s0, s1, r, count, dir, tone })),
  DIAL: { x: DIAL.x, y: DIAL.y, top: DIAL_TOP, tail: NEEDLE.tail, tip: NEEDLE.tip },
  model: { WRITE_MB: M.WRITE_MB, READ_MB: M.READ_MB, WRITE_S: M.WRITE_S, READ_S: M.READ_S, ROWS: M.ROWS, BATCH: M.BATCH, BATCHES: M.BATCHES, SLOW: M.SLOW, SLIDE_SHARE: M.SLIDE_SHARE, DIAL_MAX_MB: M.DIAL_MAX_MB, DIAL_SWEEP: M.DIAL_SWEEP },
};

const LIVE = `// Generated by www/figures/sheetstream/build.mjs. Do not edit by hand.
import { iso, slabOf, sideSeam, lineOnTop, translateAlong } from "../../vendor/anatomy/kit/iso-kit.mjs";

const D = ${JSON.stringify(DATA)};
const ribsFor = ${ribsFor.toString()};

export function mount(root, { mode = "hover" } = {}) {
  const svg = root.querySelector("svg");
  if (!svg) return { destroy() {} };
  const all = (name) => [...svg.querySelectorAll('[data-part="' + name + '"]')];
  const liftIn = all("lift-in"), liftOut = all("lift-out"), packet = all("packet")[0];
  const stacks = { in: svg.querySelector('[data-part="stack-in"]'), out: svg.querySelector('[data-part="stack-out"]') };
  const ribEls = D.ROLLS.map((def) => [...svg.querySelectorAll('[data-part="' + def.part + '"] path')]);
  const needle = svg.querySelector('[data-part="needle"]');
  const readout = root.querySelector("[data-readout]") || (root.closest(".iso-plate") ? root.closest(".iso-plate").querySelector("[data-readout]") : null);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const m = D.model;
  const P = D.P, F = D.F, T = D.T, N = D.N;
  const ease = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * x * (x * (x * 6 - 15) + 10); };
  const fmt = (n) => n.toLocaleString("en-US");

  // machine state: dir 1 writes (left stack to right), -1 reads back
  const s = { nIn: D.N_IN0, nOut: D.N_OUT0, dir: 1, want: 1, phase: "slide", u: 0.5, share: 0.5, zIn: D.Z_IN0, zOut: D.Z_OUT0, from: null, to: null, wait: 0, roll: 0, mem: m.WRITE_MB, done: false };
  const stackDrawn = { in: D.N_IN0, out: D.N_OUT0 };
  let running = false, visible = false, frame = 0, last = 0, idle = 0, armed = false;

  const per = (dir) => ((dir > 0 ? m.WRITE_S : m.READ_S) * m.SLOW) / N;
  const sourceZ = (n) => F - n * T;
  const sinkZ = (n) => F - T - n * T;
  const peak = () => (s.dir > 0 ? m.WRITE_MB : m.READ_MB);

  function setStack(side, n) {
    const g = stacks[side];
    if (!g || stackDrawn[side] === n) return;
    stackDrawn[side] = n;
    if (n <= 0) { g.setAttribute("display", "none"); return; }
    g.removeAttribute("display");
    const plan = side === "in" ? D.S_IN : D.S_OUT;
    const z0 = side === "in" ? D.Z_IN0 : D.Z_OUT0;
    const p = slabOf(plan, z0, n * T, P, 2);
    g.querySelector(".iso-fill").setAttribute("d", p.fill);
    g.querySelectorAll(".iso-shade").forEach((el) => el.setAttribute("d", p.shades[Number(el.dataset.shade)] || ""));
    g.querySelector(".iso-top").setAttribute("d", p.top);
    const crease = g.querySelector(".iso-crease"); if (crease) crease.setAttribute("d", p.crease);
    g.querySelector(".iso-edge").setAttribute("d", p.outline);
    const seams = []; for (let j = 1; j < n; j++) seams.push(sideSeam(plan, z0 + j * T, P, 2));
    g.querySelector('[data-role="seams"]').setAttribute("d", seams.join(""));
    const top = z0 + n * T, rules = [];
    for (let j = 1; j < 12; j++) rules.push(lineOnTop([plan.x, plan.y + j * 6], [plan.x + plan.w, plan.y + j * 6], top, P));
    g.querySelector('[data-role="rules"]').setAttribute("d", rules.join(""));
    g.querySelector('[data-role="margin"]').setAttribute("d", lineOnTop([plan.x + 9, plan.y], [plan.x + 9, plan.y + plan.d], top, P));
  }
  function needleAt(mb) {
    const share = Math.min(mb, m.DIAL_MAX_MB) / m.DIAL_MAX_MB;
    const a = Math.PI + share * m.DIAL_SWEEP, sn = Math.sin(a), c = Math.cos(a), d = D.DIAL;
    return lineOnTop([d.x - sn * d.tail, d.y + c * d.tail], [d.x + sn * d.tip, d.y - c * d.tip], d.top + 0.2, P);
  }
  function progress() {
    if (s.dir > 0) return (s.nOut + (s.phase === "slide" ? s.share : 0)) / N;
    return (s.nIn + (s.phase === "slide" ? 1 - s.share : 0)) / N;
  }
  function say() {
    if (!readout) return;
    const text = s.done
      ? (s.dir > 0 ? "wrote " + fmt(m.ROWS) + " rows in " + m.WRITE_S + " s · peak " + m.WRITE_MB + " MB" : "read " + fmt(m.ROWS) + " rows in " + m.READ_S + " s · peak " + m.READ_MB + " MB")
      : (s.dir > 0 ? "writing" : "reading") + " · " + fmt(Math.round(Math.min(1, progress()) * m.BATCHES) * m.BATCH) + " rows · peak " + peak() + " MB";
    if (readout.textContent !== text) readout.textContent = text;
  }
  function draw() {
    const tIn = translateAlong(P, [0, 0, s.zIn - D.Z_IN0]);
    const tOut = translateAlong(P, [0, 0, s.zOut - D.Z_OUT0]);
    liftIn.forEach((el) => el.setAttribute("transform", tIn));
    liftOut.forEach((el) => el.setAttribute("transform", tOut));
    if (s.phase === "slide") { packet.removeAttribute("display"); packet.setAttribute("transform", translateAlong(P, [s.share * D.PITCH, 0, 0])); }
    else packet.setAttribute("display", "none");
    setStack("in", s.nIn);
    setStack("out", s.nOut);
    D.ROLLS.forEach((def, i) => {
      const ribs = ribsFor(def, s.roll / def.r, P, D.V, iso);
      ribEls[i].forEach((el, j) => { el.setAttribute("d", ribs[j][0]); el.setAttribute("opacity", String(ribs[j][1])); });
    });
    needle.setAttribute("d", needleAt(s.mem));
    say();
  }
  function startPacket() {
    if (s.dir > 0) { s.nIn -= 1; s.share = 0; } else { s.nOut -= 1; s.share = 1; }
    s.phase = "slide"; s.u = 0;
  }
  function startLift(zIn, zOut, seconds, next) {
    s.phase = next; s.u = 0; s.from = [s.zIn, s.zOut]; s.to = [zIn, zOut]; s.wait = seconds;
  }
  function step(dt) {
    const dur = per(s.dir);
    if (s.phase === "slide") {
      s.u += dt / (dur * m.SLIDE_SHARE);
      const before = s.share;
      const e = ease(s.u);
      s.share = s.dir > 0 ? e : 1 - e;
      s.roll += (s.share - before) * D.PITCH;
      if (s.u >= 1) {
        if (s.dir > 0) s.nOut += 1; else s.nIn += 1;
        if (s.dir > 0) startLift(sourceZ(s.nIn), sinkZ(s.nOut), dur * (1 - m.SLIDE_SHARE), "lift");
        else startLift(sinkZ(s.nIn), sourceZ(s.nOut), dur * (1 - m.SLIDE_SHARE), "lift");
      }
    } else if (s.phase === "lift" || s.phase === "swap") {
      s.u += dt / s.wait;
      const e = ease(s.u);
      s.zIn = s.from[0] + (s.to[0] - s.from[0]) * e;
      s.zOut = s.from[1] + (s.to[1] - s.from[1]) * e;
      if (s.u >= 1) {
        s.zIn = s.to[0]; s.zOut = s.to[1];
        if (s.phase === "swap") { s.done = false; return running ? startPacket() : (s.phase = "idle"); }
        const empty = s.dir > 0 ? s.nIn === 0 : s.nOut === 0;
        if (empty) { s.done = true; s.phase = "pause"; s.u = 0; return; }
        if (s.want !== s.dir) return swap();
        if (!running) { s.phase = "idle"; return; }
        startPacket();
      }
    } else if (s.phase === "pause") {
      s.u += dt;
      if (s.u >= 1.8 && running) { s.want = -s.dir; swap(); }
    } else if (s.phase === "idle") {
      if (running) { if (s.want !== s.dir) swap(); else startPacket(); }
    }
  }
  function swap() {
    s.dir = -s.dir; s.want = s.dir;
    // the new source rises to the feed line, the new sink drops one packet below it
    if (s.dir > 0) startLift(sourceZ(s.nIn), sinkZ(s.nOut), 0.7, "swap");
    else startLift(sinkZ(s.nIn), sourceZ(s.nOut), 0.7, "swap");
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (!still.matches && armed) {
      step(dt);
      const active = s.phase === "slide" || s.phase === "lift";
      const target = active ? (s.phase === "slide" ? peak() : peak() - 4) : s.mem;
      s.mem += (target - s.mem) * (1 - Math.exp(-dt / 0.3));
    }
    draw();
    const settled = s.phase === "idle" || (s.phase === "pause" && !running);
    frame = visible && armed && !still.matches && !(settled && !running) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible && armed && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" });
  io.observe(root);

  const enter = () => { running = true; armed = true; run(); };
  const leave = () => { running = false; };
  const toggle = () => { s.want = -s.dir; running = true; armed = true; clearTimeout(idle); run(); };
  const onKey = (event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); toggle(); } };
  if (mode === "tour") {
    idle = setTimeout(() => { running = true; armed = true; run(); }, 900);
    root.addEventListener("click", toggle);
    root.addEventListener("keydown", onKey);
  } else {
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
  }
  draw();
  return {
    destroy() {
      cancelAnimationFrame(frame); frame = 0; clearTimeout(idle); io.disconnect();
      root.removeEventListener("click", toggle); root.removeEventListener("keydown", onKey);
      root.removeEventListener("pointerenter", enter); root.removeEventListener("pointerleave", leave);
    },
  };
}
`;
writeFileSync(join(SRC, "sheetstream.live.js"), LIVE);

// ---- previews: the full card, live in tour mode ----
const inline = LIVE.replace(/^import .*$/m, "").replace(/^export /gm, "") + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
const plate = k.plateHtml({
  fig: "Fig",
  title: "sheetstream",
  hint: "Click to switch write and read",
  readout: "writing · 438,000 rows · peak 82 MB",
  keys: [
    { mark: "lit", label: "Memory gauge needle: holds near 82 MB while the stack drains" },
    { mark: "raised", label: "Ledger sheets: rows crossing in batches of 1,000" },
  ],
  caption:
    "A sheet feeder. Packets of ledger sheets leave the tall stack, pass between a pair of rollers and land on the second stack, the way rows cross from the Rust core to JavaScript in batches of 1,000. The gauge reads 0 to 1,000 MB: it holds at 82 MB writing 1M rows and at 93 MB reading them back, while its set pointer marks 749 MB, the least a common JavaScript library needs for the same file. The tour runs at one third of real time.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Sheet feeder. Press Space or click to switch between writing and reading.">${svg}</div>`,
});
for (const theme of ["light", "dark"]) {
  writeFileSync(join(HERE, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "sheetstream", theme, body: plate, script: kitScript() + inline }));
}
console.log(`wrote sheetstream.svg, sheetstream.live.js, previews · ${R.items.length} items · ${R.solids.length} solids · scale ${G.scaleOf(P).toFixed(3)} · ${(svg.length / 1024).toFixed(0)} KB svg`);

A.auditOrExit(R, P, { frames: STATES });
