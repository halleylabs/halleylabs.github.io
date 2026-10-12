// purify-edge anatomy figure: a light filter stand at the edge of the bench, running drops
// through a stock mesh cartridge into a clean receiving flask.
// node build.mjs writes src/figures/purify-edge.svg, src/figures/purify-edge.live.js and the
// two preview pages; node build.mjs --audit also proves the geometry.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import * as A from "../../vendor/anatomy/kit/audit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import { DRIP, LEVEL, METRICS, levelAt, readoutOf } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src", "figures");
const W = 480;
const H = 320;

// ---------- world plan ----------
const PLATE = { x: -114, y: -66, w: 228, d: 132, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const AX = [86, 4]; // rig axis: flask, cartridge, funnel, input funnel
const ROD = [54, 4];
const ROD_R = 1.7;
const BASE = { x: 40, y: -14, w: 66, d: 36, r: 4 };
const BASE_H = 3;

const FLASK_Z = BASE_H;
const FLASK = [[0, 11.4], [0.8, 12.2], [1.6, 12.2], [17.5, 4], [22.4, 4]];
const FLASK_LIP = { s0: 22.4, s1: 24, r: 4.8 };
const MOUTH_Z = FLASK_Z + 24;
const CONE = { s0: 1.6, r0: 12.2, s1: 17.5, r1: 4 };
const CONE_M = (CONE.r1 - CONE.r0) / (CONE.s1 - CONE.s0);
const coneR = (s) => CONE.r0 + CONE_M * (s - CONE.s0);

const OUTLET = { r: 0.9, z0: 32.6, z1: 38 };
const CART = { cap: 6.6, r: 6, z0: 38, z1: 48, capH: 1.4 };
const INLET = { r: 1.3, z0: 48, z1: 50 };
const UNION = { r: 2.3, z0: 50, z1: 51.8 };
const STEM = { r: 1.4, z0: 51.8, z1: 57 };
const FUNNEL_Z = 57;
const FUNNEL = [[0, STEM.r], [10, 11]];
const FUNNEL_LIP = { s0: 10, s1: 11, r: 11.6 };
const LIP_Z = FUNNEL_Z + 11;

const TIP_Z = 76;
const BARREL = { z: 81.8, r: 1.8, half: 4 };
const NECK_IN = 0.8; // stem radius above and below the stopcock
const STEM_LOW = { z0: TIP_Z, z1: BARREL.z - Math.sqrt(BARREL.r ** 2 - NECK_IN ** 2) };
const STEM_UP = { z0: BARREL.z + Math.sqrt(BARREL.r ** 2 - NECK_IN ** 2), z1: 85 };
const BULB = { z: 85, h: 16 };
const bulbR = (s) => {
  const u = s / BULB.h;
  return 1 + u + 6.2 * Math.sin(Math.PI * Math.pow(u, 1.4));
};
const bulbSlope = (s) => {
  const u = Math.max(1e-6, s / BULB.h);
  return (1 + 6.2 * Math.PI * Math.cos(Math.PI * Math.pow(u, 1.4)) * 1.4 * Math.pow(u, 0.4)) / BULB.h;
};
const NECK = { r: 2, z0: BULB.z + BULB.h, z1: BULB.z + BULB.h + 3 };

const BOSS1 = { z0: 50, z1: 57 };
const BOSS2 = { z0: 99, z1: 106 };
const ROD_TOP = 111;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [ROD[0], ROD[1], ROD_TOP + 1.4], [AX[0], AX[1], NECK.z1 + 3.4]],
  W,
  H,
  { pad: 22, azimuth: 45, elevation: 30 },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const up = (x, y, z) => G.frameAlong([x, y, z], [0, 0, 1]);

// ---------- the recorder: every drawn item carries its true shape ----------
const R = A.recorder(P);
function put(name, centre, svg, shapes, bias = 0) {
  R.put({ name, at: centre, bias, svg, shapes: shapes.map((shape) => R.solid({ ...shape, name: shape.name ?? name })) });
}
function slabItem(name, plan, z, h, style = {}, { steps = 4, bevel = 0, extra = "", inner = "", bias = 0, meta = {}, pre = "" } = {}) {
  const svg = pre + S(k.slabOf(plan, z, h, P, steps, bevel), { ...style, inner }) + extra;
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg, [A.slab(plan, z, h, { name, ...meta }, steps)], bias);
}
function cylItem(name, x, y, r, z, h, style = {}, { steps = 28, bevel = 0, extra = "", inner = "", bias = 0, meta = {} } = {}) {
  const svg = S(k.cylinder(x, y, r, z, h, P, steps, bevel), { ...style, inner }) + extra;
  put(name, [x, y, z + h / 2], svg, [A.cylinder(x, y, r, z, h, { name, ...meta })], bias);
}

// ---------- bench plate ----------
const plateSvg = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
plateSvg.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "lo", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
plateSvg.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
const plateScrews = k.corners(PLATE, 10);
plateSvg.push(L(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
plateSvg.push(D(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
const FEET = k.corners(PLATE, 22);
for (const [x, y] of FEET) {
  cylItem("stand.foot-flange", x, y, 7, -PLATE_H - FOOT_H, 1.6, { tone: "lo" });
  cylItem("stand.foot", x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, { tone: "lo" });
}
put("stand.plate", [0, 0, -PLATE_H / 2], plateSvg.join(""), [A.slab(PLATE, -PLATE_H, PLATE_H, {}, 8)], -40);

// engraved label plate: three rule lines stand for text
const LAB = { x: -100, y: 28, w: 40, d: 12, r: 1.6 };
slabItem("label", LAB, 0, 0.8, { tone: "lo", crease: "none" }, {
  extra:
    L(k.planOutline(k.insetPlan(LAB, 1.5), 0.8, P, 4), { tone: "faint" }) +
    L([0, 1, 2].map((row) => k.lineOnTop([LAB.x + 7, LAB.y + 3.6 + row * 2.4], [LAB.x + (row === 1 ? 24 : 33), LAB.y + 3.6 + row * 2.4], 0.8, P)).join(""), { tone: "lo", free: true }) +
    D([at([LAB.x + 3.4, LAB.y + LAB.d / 2, 0.8]), at([LAB.x + LAB.w - 3.4, LAB.y + LAB.d / 2, 0.8])], { size: 0.45 }),
});

// bench rule along the front edge
const RULE = { x: -96, y: PLATE.y + PLATE.d - 15, w: 176, d: 7, r: 1 };
{
  const t = k.topTicks(RULE.x + 4, RULE.x + RULE.w - 4, 4, 5, RULE.y + 0.8, 0.6, [2, 3.6], P);
  slabItem("rule", RULE, 0, 0.6, { tone: "lo", crease: "none" }, {
    steps: 3,
    extra: L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + D([at([RULE.x + 2, RULE.y + 3.5, 0.6]), at([RULE.x + RULE.w - 2, RULE.y + 3.5, 0.6])], { size: 0.45 }),
  });
}

// ---------- the light stand ----------
slabItem("rig.base", BASE, 0, BASE_H, { tone: "mid" }, {
  bevel: 0.8,
  pre: `<path class="iso-halo" d="${k.haloOf(k.insetPlan(BASE, 2), 0, 1, P)}" style="filter:blur(4px)"/>`,
  extra:
    L(k.planOutline(k.insetPlan(BASE, 3), BASE_H, P, 4), { tone: "faint" }) +
    D(k.corners(BASE, 6).map(([x, y]) => at([x, y, BASE_H])), { size: 0.45 }),
  inner: L(k.sideSeam(BASE, 1.2, P, 4), { tone: "faint" }),
});
cylItem("rig.collar", ROD[0], ROD[1], 3, BASE_H, 2.4, { tone: "mid" }, { extra: L(k.knurl(ROD[0], ROD[1], 3, BASE_H, BASE_H + 2.4, 18, P), { tone: "lo" }) });
const rodPieces = [[BASE_H + 2.4, BOSS1.z0], [BOSS1.z1, BOSS2.z0], [BOSS2.z1, ROD_TOP]];
rodPieces.forEach(([z0, z1], i) => cylItem(`rig.rod${i}`, ROD[0], ROD[1], ROD_R, z0, z1 - z0, { tone: "mid", crease: "none" }, { steps: 20 }));
cylItem("rig.rod-cap", ROD[0], ROD[1], 2.3, ROD_TOP, 1.4, { tone: "mid" }, { bevel: 0.3 });

function bossHead(name, z0, z1, armZ, clampX, clampZ) {
  const plan = { x: ROD[0] - 3.5, y: ROD[1] - 3.5, w: 7, d: 7, r: 1 };
  slabItem(`${name}.boss`, plan, z0, z1 - z0, { tone: "mid" }, { bevel: 0.4, inner: L(k.sideSeam(plan, (z0 + z1) / 2, P, 4), { tone: "faint" }) });
  // thumb screw on the boss face
  const F = G.frameAlong([ROD[0], plan.y + plan.d, (z0 + z1) / 2], [0, 1, 0]);
  put(`${name}.screw-neck`, G.pointOf(F, 0.8, 0, 0), S(G.disc(0, 1.6, 0.9, F, P), { tone: "mid" }), [A.disc(F, 0, 1.6, 0.9)]);
  const ribs = G.ribsOf(F, 1.6, 4.4, 2.1, 16, P, { fade: [0.1, 0.55] });
  put(`${name}.screw-head`, G.pointOf(F, 3, 0, 0), S(G.disc(1.6, 4.4, 2.1, F, P), { tone: "mid" }) + k.fadedSvg(ribs, { tone: "lo" }), [A.disc(F, 1.6, 4.4, 2.1)]);
  // arm to the clamp jaw
  const arm = { x: plan.x + plan.w, y: AX[1] - 0.9, w: clampX - (plan.x + plan.w), d: 1.8, r: 0.4 };
  slabItem(`${name}.arm`, arm, armZ, 1.8, { tone: "mid" }, { steps: 2, extra: D([at([arm.x + 2, AX[1], armZ + 1.8])], { size: 0.35 }) });
  return arm;
}
const ARM1 = bossHead("rig.lower", BOSS1.z0, BOSS1.z1, 53, AX[0] - STEM.r - 5, 0);
const ARM2 = bossHead("rig.upper", BOSS2.z0, BOSS2.z1, 101.6, AX[0] - NECK.r - 5, 0);
// clamp jaws: blocks that grip the funnel stem and the input funnel's neck from behind
const JAW1 = { x: AX[0] - STEM.r - 5, y: AX[1] - 2.4, w: 5, d: 4.8, r: 0.6 };
slabItem("rig.lower.jaw", JAW1, STEM.z0, 4, { tone: "mid" }, { bevel: 0.3, inner: L(k.sideSeam(JAW1, STEM.z0 + 2, P, 4), { tone: "faint" }) });
const JAW2 = { x: AX[0] - NECK.r - 5, y: AX[1] - 2.4, w: 5, d: 4.8, r: 0.6 };
slabItem("rig.upper.jaw", JAW2, NECK.z0, 3, { tone: "mid" }, { bevel: 0.3 });

// ---------- receiving flask ----------
const FF = up(AX[0], AX[1], FLASK_Z);
// limb angles of a level line on the cone: visible where the outward normal faces the viewer
const VA = Math.atan2(V[1], V[0]);
const LIMB = Math.acos(Math.max(-1, Math.min(1, (CONE_M * V[2]) / Math.hypot(V[0], V[1]))));
const levelPath = (s) => {
  const r = coneR(s);
  const pts = [];
  const n = 40;
  const span = LIMB - 0.004;
  for (let i = 0; i <= n; i++) {
    const t = VA - span + (2 * span * i) / n;
    pts.push(at([AX[0] + r * Math.cos(t), AX[1] + r * Math.sin(t), FLASK_Z + s]));
  }
  return k.pathOf(pts);
};
const REST_COUNT = 141;
const mouth = G.circleOf(FF, 24, 3.6, P, 40);
put(
  "rig.flask",
  [AX[0], AX[1], FLASK_Z + 10],
  S(G.solidOf(FLASK, FF, P), {
    tone: "hi",
    inner: `<path data-part="level" class="iso-line" data-tone="mid" d="${levelPath(levelAt(REST_COUNT))}"/>`,
  }),
  [A.solid(FF, FLASK)],
);
put(
  "rig.flask-lip",
  [AX[0], AX[1], FLASK_Z + 23.2],
  S(G.disc(FLASK_LIP.s0, FLASK_LIP.s1, FLASK_LIP.r, FF, P), { tone: "hi" }) + `<path class="iso-shade" data-shade="0" d="${mouth}"/>` + L(mouth, { tone: "mid" }),
  [A.disc(FF, FLASK_LIP.s0, FLASK_LIP.s1, FLASK_LIP.r)],
);

// ---------- the cartridge, outlet and inlet ----------
function cartridge(prefix, x, y, z0, { lit = false, tone = "hi" } = {}) {
  const c0 = z0, b0 = c0 + CART.capH, b1 = b0 + (CART.z1 - CART.z0 - 2 * CART.capH), c1 = b1 + CART.capH;
  cylItem(`${prefix}.cap-low`, x, y, CART.cap, c0, CART.capH, { tone: "mid" }, { steps: 40, bevel: 0.3 });
  const m0 = b0 + 0.9, m1 = b1 - 0.9;
  const mesh =
    L(k.knurl(x, y, CART.r, m0, m1, 40, P, 0), { tone: lit ? "mid" : "lo" }) +
    L([m0, (m0 + m1) / 2, m1].map((z) => k.sideArc(x, y, CART.r, z, P, 32)).join(""), { tone: lit ? "mid" : "lo" });
  cylItem(`${prefix}.body`, x, y, CART.r, b0, b1 - b0, { tone, lit }, { steps: 40, inner: mesh });
  cylItem(`${prefix}.cap-high`, x, y, CART.cap, b1, CART.capH, { tone: "mid" }, { steps: 40, bevel: 0.3, extra: L(k.ring(x, y, CART.cap - 1.4, c1, P, 32), { tone: "faint" }) });
  return c1;
}
cylItem("rig.outlet", AX[0], AX[1], OUTLET.r, OUTLET.z0, OUTLET.z1 - OUTLET.z0, { tone: "mid" }, { steps: 16 });
cartridge("rig.cartridge", AX[0], AX[1], CART.z0, { lit: true });
cylItem("rig.inlet", AX[0], AX[1], INLET.r, INLET.z0, INLET.z1 - INLET.z0, { tone: "mid" }, { steps: 16 });
cylItem("rig.union", AX[0], AX[1], UNION.r, UNION.z0, UNION.z1 - UNION.z0, { tone: "mid" }, { steps: 20, extra: L(k.knurl(AX[0], AX[1], UNION.r, UNION.z0, UNION.z1, 14, P), { tone: "lo" }) });
cylItem("rig.stem", AX[0], AX[1], STEM.r, STEM.z0, STEM.z1 - STEM.z0, { tone: "hi", crease: "none" }, { steps: 16 });

// ---------- the funnel ----------
const FUF = up(AX[0], AX[1], FUNNEL_Z);
const funnelMouth = G.circleOf(FUF, 11, 10.6, P, 64);
put(
  "rig.funnel",
  [AX[0], AX[1], FUNNEL_Z + 7],
  S(G.solidOf(FUNNEL, FUF, P), { tone: "hi" }),
  [A.solid(FUF, FUNNEL)],
);
put(
  "rig.funnel-lip",
  [AX[0], AX[1], FUNNEL_Z + 10.5],
  S(G.disc(FUNNEL_LIP.s0, FUNNEL_LIP.s1, FUNNEL_LIP.r, FUF, P), { tone: "hi" }) +
    `<path class="iso-shade" data-shade="0" d="${funnelMouth}"/>` +
    L(funnelMouth, { tone: "mid" }) +
    L(G.circleOf(FUF, 11, 5.2, P, 40), { tone: "faint" }),
  [A.disc(FUF, FUNNEL_LIP.s0, FUNNEL_LIP.s1, FUNNEL_LIP.r)],
);

// ---------- the input funnel with its stopcock ----------
cylItem("rig.tip", AX[0], AX[1], NECK_IN, STEM_LOW.z0, STEM_LOW.z1 - STEM_LOW.z0, { tone: "hi", crease: "none" }, { steps: 14 });
const BF = G.frameAlong([AX[0] - BARREL.half, AX[1], BARREL.z], [1, 0, 0]);
put("rig.barrel", [AX[0], AX[1], BARREL.z], S(G.disc(0, BARREL.half * 2, BARREL.r, BF, P), { tone: "mid" }), [A.disc(BF, 0, BARREL.half * 2, BARREL.r)]);
put(
  "rig.handle",
  [AX[0] + BARREL.half + 0.4, AX[1], BARREL.z],
  S(G.disc(BARREL.half * 2, BARREL.half * 2 + 0.9, 2.8, BF, P), { tone: "mid" }) + L(G.circleOf(BF, BARREL.half * 2 + 0.9, 1.2, P, 20), { tone: "faint" }),
  [A.disc(BF, BARREL.half * 2, BARREL.half * 2 + 0.9, 2.8)],
);
cylItem("rig.tip-up", AX[0], AX[1], NECK_IN, STEM_UP.z0, STEM_UP.z1 - STEM_UP.z0, { tone: "hi", crease: "none" }, { steps: 14 });
const BUF = up(AX[0], AX[1], BULB.z);
const BULB_PROFILE = Array.from({ length: 25 }, (_, i) => {
  const s = (i / 24) * BULB.h;
  return [s, bulbR(s), i > 0 && i < 24 ? 1 : 0];
});
put(
  "rig.bulb",
  [AX[0], AX[1], BULB.z + BULB.h / 2],
  S(G.solidOf(BULB_PROFILE, BUF, P, { smooth: { slope: bulbSlope, radius: bulbR } }), { tone: "hi" }),
  [A.solid(BUF, BULB_PROFILE, { radius: bulbR })],
);
cylItem("rig.neck", AX[0], AX[1], NECK.r, NECK.z0, NECK.z1 - NECK.z0, { tone: "hi", crease: "none" }, { steps: 20 });
cylItem("rig.stopper", AX[0], AX[1], 2.5, NECK.z1, 2.4, { tone: "mid" }, { steps: 20 });
cylItem("rig.stopper-top", AX[0], AX[1], 3.1, NECK.z1 + 2.4, 1, { tone: "mid" }, { steps: 24, bevel: 0.3 });

// ---------- the test vectors waiting in a rack ----------
const RACK = { x: -90, y: -46, w: 76, d: 24, r: 2 };
const VIALS = [];
for (const y of [-40, -28]) for (let i = 0; i < 5; i++) VIALS.push([-80 + 14 * i, y]);
slabItem("rack", RACK, 0, 10, { tone: "mid" }, {
  bevel: 0.6,
  inner: L(k.sideSeam(RACK, 4, P, 4), { tone: "faint" }),
  pre: `<path class="iso-halo" d="${k.haloOf(k.insetPlan(RACK, 2), 0, 1, P)}" style="filter:blur(4px)"/>`,
  extra:
    L(VIALS.map(([x, y]) => k.ring(x, y, 3.9, 10, P, 28)).join(""), { tone: "lo" }),
});
VIALS.forEach(([x, y], i) => {
  cylItem(`rack.vial${i}`, x, y, 3.2, 10, 15, { tone: "hi" }, { steps: 28, inner: L(k.sideArc(x, y, 3.2, 14, P, 20) + k.sideArc(x, y, 3.2, 20, P, 20), { tone: "faint" }) });
  cylItem(`rack.cap${i}`, x, y, 3.6, 25, 3, { tone: "mid" }, { steps: 28, bevel: 0.3, extra: L(k.knurl(x, y, 3.6, 25, 28, 20, P), { tone: "lo" }) });
});

// ---------- spare cartridges in a tray: the same stock part ----------
const TRAY = { x: -42, y: 6, w: 44, d: 20, r: 2 };
slabItem("tray", TRAY, 0, 2.4, { tone: "mid" }, {
  bevel: 0.5,
  pre: `<path class="iso-halo" d="${k.haloOf(k.insetPlan(TRAY, 2), 0, 1, P)}" style="filter:blur(4px)"/>`,
  extra: L(k.planOutline(k.insetPlan(TRAY, 2.4), 2.4, P, 4), { tone: "faint" }),
});
for (const [i, x] of [-30, -10].entries()) {
  const top = cartridge(`spare${i}`, x, 16, 2.4, { tone: "mid" });
  cylItem(`spare${i}.inlet`, x, 16, INLET.r, top, 2, { tone: "mid" }, { steps: 16 });
}

// ---------- settle the painter's order from the recorded shapes ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

// ---------- drops: live overlays in free air, above every part ----------
const DROP_R = 0.95;
const dropAt = (z) => at([AX[0], AX[1], z]);
const IN_DROP = { tip: TIP_Z, mouth: LIP_Z, centre: dropAt(TIP_Z - DROP_R) };
const OUT_DROP = { tip: OUTLET.z0, mouth: MOUTH_Z, centre: dropAt(OUTLET.z0 - DROP_R) };
const dropSvg = (part, z) => `<g data-part="${part}" style="display:none">${S(G.sphereOf([AX[0], AX[1], z], DROP_R, P), { tone: "hi" })}</g>`;

const body = [...R.items.map((item) => item.svg), dropSvg("drop-in", IN_DROP.tip - DROP_R), dropSvg("drop-out", OUT_DROP.tip - DROP_R)];
const LABEL =
  "A light laboratory filter stand at the edge of a bench. Drops fall one at a time from a stoppered input funnel into a funnel, pass through a stock mesh cartridge and drip clean into a receiving flask. Spare cartridges in a tray are the same part, and a rack of capped vials holds the samples waiting.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body });
writeFileSync(join(SRC, "purify-edge.svg"), svg + "\n");

// ---------- live behaviour ----------
const unit = (v) => {
  const o = at([0, 0, 0]), p = at(v);
  return [p[0] - o[0], p[1] - o[1]];
};
const DATA = {
  EZ: unit([0, 0, 1]),
  DROP_R,
  inDrop: IN_DROP,
  outDrop: OUT_DROP,
  drip: DRIP,
  level: LEVEL,
  vectors: METRICS.vectors,
  rest: REST_COUNT,
  cone: { ...CONE, m: CONE_M, z: FLASK_Z, x: AX[0], y: AX[1], va: VA, limb: LIMB - 0.004 },
  P,
};
const LIVE = `
const PE = ${JSON.stringify(DATA)};
function mount(root, { mode = "tour" } = {}) {
  const svg = root.querySelector("svg");
  const part = (name) => svg.querySelector('[data-part="' + name + '"]');
  const dropIn = part("drop-in"), dropOut = part("drop-out"), level = part("level");
  const plate = root.closest(".iso-plate") || root;
  const readout = plate.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const D = PE.drip, C = PE.cone;
  let count = PE.rest, shown = PE.rest, levelS = null;
  let clock = 0, nextAt = 0.4, drops = [], frame = 0, last = 0, visible = false, hovering = false, open = false;
  let touring = mode === "tour", idle = 0;
  const levelOf = (n) => PE.level.empty + (PE.level.full - PE.level.empty) * Math.min(1, n / PE.vectors);
  const levelPath = (s) => {
    const r = C.r0 + C.m * (s - C.s0);
    let d = "";
    for (let i = 0; i <= 40; i++) {
      const t = C.va - C.limb + (2 * C.limb * i) / 40;
      const p = iso([C.x + r * Math.cos(t), C.y + r * Math.sin(t), C.z + s], PE.P);
      d += (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2);
    }
    return d;
  };
  const say = (text) => { if (readout && readout.textContent !== text) readout.textContent = text; };
  // one drop: forms at a tip, falls, fades into the mouth below
  const place = (node, spec, t) => {
    const form = D.form, fall = D.fall;
    if (t < 0 || t > form + fall) { node.style.display = "none"; return; }
    node.style.display = "";
    const [cx, cy] = spec.centre;
    let scale = 1, dz = 0, alpha = 1;
    if (t < form) scale = 0.25 + 0.75 * ease(t / form);
    else {
      const f = (t - form) / fall;
      dz = -(spec.tip - spec.mouth) * f * f;
      const left = spec.tip - PE.DROP_R + dz - spec.mouth;
      alpha = Math.max(0, Math.min(1, left / 1.8));
    }
    const dx = PE.EZ[0] * dz, dy = PE.EZ[1] * dz;
    node.setAttribute("transform", "translate(" + (dx + cx).toFixed(2) + " " + (dy + cy).toFixed(2) + ") scale(" + scale.toFixed(3) + ") translate(" + (-cx).toFixed(2) + " " + (-cy).toFixed(2) + ")");
    node.setAttribute("opacity", alpha.toFixed(3));
  };
  function step(dt) {
    clock += dt;
    const running = (touring && !still.matches) || (mode === "hover" && hovering);
    const gap = open || (mode === "hover" && hovering) ? D.open : D.idle;
    if (running && clock >= nextAt) {
      // only one drop on each tip at a time
      if (!drops.length || clock - drops[drops.length - 1].at >= D.form + D.fall) { drops.push({ at: clock, done: false }); nextAt = clock + gap; }
    }
    const life = D.form + D.fall + D.pass + D.form + D.fall;
    for (const d of drops) {
      if (!d.done && clock - d.at >= life) {
        d.done = true;
        count = count >= PE.vectors ? 1 : count + 1;
        shown = count;
      }
    }
    while (drops.length && drops[0].done) drops.shift();
    const target = levelOf(shown);
    if (levelS !== null) levelS += (target - levelS) * (1 - Math.exp(-dt / (shown === 1 ? 0.6 : 0.25)));
    return running || drops.length > 0 || Math.abs(target - (levelS ?? target)) > 1e-3;
  }
  function tick(now) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const going = step(dt);
    drawFrame();
    if (visible && going && !still.matches) frame = requestAnimationFrame(tick);
  }
  const inFlight = (t) => t >= 0 && t <= D.form + D.fall;
  function drawFrame() {
    const fresh = drops.find((d) => inFlight(clock - d.at));
    place(dropIn, PE.inDrop, fresh ? clock - fresh.at : -1);
    const lag = D.form + D.fall + D.pass;
    const out = drops.find((d) => inFlight(clock - d.at - lag));
    place(dropOut, PE.outDrop, out ? clock - out.at - lag : -1);
    if (levelS === null) levelS = levelOf(shown);
    level.setAttribute("d", levelPath(levelS));
    say("vector " + shown + " of " + PE.vectors + " · identical");
  }
  const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run(); else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: "120px 0px" });
  io.observe(root);
  const onEnter = () => { hovering = true; if (mode === "tour") open = true; run(); };
  const onLeave = () => { hovering = false; open = false; };
  const instant = () => { count = count >= PE.vectors ? 1 : count + 1; shown = count; levelS = levelOf(shown); drawFrame(); };
  const onKey = (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (still.matches) { instant(); return; }
      open = !open;
      run();
    }
  };
  const onDown = (event) => { if (still.matches) instant(); else if (event.pointerType !== "mouse") { open = !open; run(); } };
  root.addEventListener("pointerenter", onEnter);
  root.addEventListener("pointerleave", onLeave);
  if (mode === "tour") { root.addEventListener("keydown", onKey); root.addEventListener("pointerdown", onDown); }
  const onMotion = () => { if (still.matches) { if (frame) cancelAnimationFrame(frame); frame = 0; drops = []; drawFrame(); } else run(); };
  still.addEventListener("change", onMotion);
  drawFrame();
  return {
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(idle);
      io.disconnect();
      still.removeEventListener("change", onMotion);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("keydown", onKey);
      root.removeEventListener("pointerdown", onDown);
    },
  };
}
`;
writeFileSync(
  join(SRC, "purify-edge.live.js"),
  `// purify-edge figure, live behaviour. Generated by www/figures/purify-edge/build.mjs.\nimport { iso } from "../../vendor/anatomy/kit/iso-kit.mjs";\n` + LIVE.replace("function mount(", "export function mount("),
);

// ---------- preview pages ----------
const card = k.plateHtml({
  fig: "Fig",
  title: "purify-edge",
  hint: "Hover to open the stopcock",
  readout: readoutOf(REST_COUNT),
  keys: [
    { mark: "lit", label: "The cartridge: DOMPurify itself, unmodified" },
    { mark: "raised", label: "A light stand: about 65 KB gzipped, no jsdom" },
  ],
  caption: `Every sample runs through the same stock cartridge, and every drop that reaches the flask matches the old rig's: ${METRICS.identical} of DOMPurify's ${METRICS.vectors} official test vectors come out byte-identical. The stand is what changed: a small DOM built on parse5 instead of jsdom, ${METRICS.gzip} gzipped, ${METRICS.faster} faster, and light enough for Cloudflare Workers and other edge runtimes.`,
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Filter stand running test vectors through a stock cartridge. Hover, tap or press Space to open the stopcock and run drops faster.">${svg}</div>`,
});
const PAGE_CSS = `<style>.iso-stage{touch-action:pan-y;outline:none}.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}</style>`;
const script = kitScript() + LIVE + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
for (const theme of ["light", "dark"]) {
  writeFileSync(join(HERE, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "purify-edge", theme, body: PAGE_CSS + card, script, width: 560 }));
}
console.log(`wrote purify-edge.svg, purify-edge.live.js, previews · ${R.items.length} items`);

A.auditOrExit(R, P, {});
