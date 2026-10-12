// node build.mjs  writes the context-broker figure: the bare site SVG, its live module and two preview pages.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WWW = join(HERE, "..", "..");
const SLUG = "context-broker";
const WIDTH = 480;
const HEIGHT = 320;
const AZIMUTH = 45;

// ---------------------------------------------------------------- world
const PLATE = { x: -128, y: -72, w: 256, d: 146, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

const BODY = { x: -68, y: -66, w: 136, d: 30, r: 4 };
const BODY_FRONT = BODY.y + BODY.d; // -36
const BODY_TOP = 50;
const ARM_Z = 37;
const ARM_TOP = 46;

const XT = -50; // tracer stylus
const XC = 50; // cutting wheel
const YS = -14; // the line the stylus and the wheel both touch
const KZ = 24; // top of the vises, where the keys lie
const STYLUS_R = 0.8;
const WHEEL_R = 9;
const WHEEL = [XC, YS - WHEEL_R];
const WHEEL_Z = KZ - 1.2;
const WHEEL_H = 3;

const RAILS = [-4, 16];
const RAIL_X = [-120, 120];
const SADDLE = { x: -90, y: -9, w: 172, d: 34, r: 2 };
const SADDLE_Z = 4;
const SADDLE_TOP = 9;
const TABLE = { x: -88, y: -10, w: 168, d: 27, r: 1.5 };
const TABLE_TOP = 14;
const TABLE_FRONT = TABLE.y + TABLE.d; // 17
const POST_Y = 22;
const SPRINGS = [-45, 55];

const S_START = 2;
const S_END = M.BLADE - 1;
// keys are built a half stroke to the left, so the carriage runs from +SHIFT to -SHIFT about the centre
const SHIFT = (S_START + S_END) / 2;
// the figure rests with the cut finished: carriage at the end of its stroke, skeleton cut
const REST_CX = SHIFT - S_END;
const REST_CY = -M.depthAt(S_END);
const MASTER = { origin: [XT - SHIFT, YS], width: 13, thick: 3.2, bow: [13, 13.5], hole: 4, shoulder: 2.6 };
const BLANK = { origin: [XC - SHIFT, YS], width: 7.4, thick: 1.1, bow: [7, 7], hole: 4.6, shoulder: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [XC, -26, 74], [BODY.x, BODY.y, BODY_TOP]],
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
const rad = (deg) => (deg * Math.PI) / 180;

// ---------------------------------------------------------------- keys
// A key's outline on the floor plane, in world units at carriage home. The cut edge faces -y,
// toward the stylus and the wheel; s runs from the shoulder to the tip along +x.
function keyRing(key, cutTo) {
  const [ox, oy] = key.origin;
  const W = key.width;
  const L = M.BLADE;
  const ring = [];
  const depth = (s) => (s <= cutTo ? M.depthAt(s) : s > L - 4 ? M.depthAt(s) : 0);
  for (let s = 0; s <= L + 1e-9; s += 0.2) ring.push([ox + s, oy + depth(s)]);
  const tip = M.depthAt(L);
  ring.push([ox + L, oy + Math.max(tip, W - 2.6)]);
  ring.push([ox + L - 2.6, oy + W]);
  ring.push([ox, oy + W]);
  const sh = key.shoulder;
  ring.push([ox, oy + W + sh]);
  ring.push([ox - 3, oy + W + sh]);
  // the bow, an oval joined to the shoulder on both sides
  const [rx, ry] = key.bow;
  const cx = ox - 3 - rx + 1.2;
  const cy = oy + W / 2;
  const top = Math.asin(Math.min(1, (W / 2 + sh) / ry));
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const a = top + ((Math.PI * 2 - 2 * top) * i) / steps;
    ring.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  ring.push([ox - 3, oy - sh]);
  ring.push([ox, oy - sh]);
  // drop points that sit on a straight run, so an uncut edge is one segment
  return ring.filter((p, i) => {
    const a = ring[(i + ring.length - 1) % ring.length];
    const b = ring[(i + 1) % ring.length];
    return Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) > 1e-6;
  });
}
const holeOf = (key) => {
  const [ox, oy] = key.origin;
  const [rx] = key.bow;
  return [ox - 3 - rx + 1.2 - rx * 0.32, oy + key.width / 2];
};

function keySolid(key, cutTo) {
  return k.extrude(keyRing(key, cutTo), KZ, key.thick, P, { convex: false });
}

// clip a convex screen polygon by another (Sutherland-Hodgman); both counter-clockwise or both clockwise
function clipConvex(subject, clip) {
  const area = (pts) => pts.reduce((sum, [x, y], i) => { const [nx, ny] = pts[(i + 1) % pts.length]; return sum + x * ny - nx * y; }, 0);
  const sign = Math.sign(area(clip));
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const [ax, ay] = clip[i];
    const [bx, by] = clip[(i + 1) % clip.length];
    const inside = ([x, y]) => sign * ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) >= 0;
    const cross = ([px, py], [qx, qy]) => {
      const t = ((bx - ax) * (ay - py) - (by - ay) * (ax - px)) / ((bx - ax) * (qy - py) - (by - ay) * (qx - px));
      return [px + (qx - px) * t, py + (qy - py) * t];
    };
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      if (inside(q)) { if (!inside(p)) out.push(cross(p, q)); out.push(q); }
      else if (inside(p)) out.push(cross(p, q));
    }
  }
  return out;
}

// the bow's hole: its rim, the inner wall seen through it, and the light below the key
function holeSvg(key, z = KZ, flipAbout = null) {
  let [hx, hy] = holeOf(key);
  if (flipAbout !== null) hx = 2 * flipAbout - hx;
  const ring = k.circleRing(hx, hy, key.hole, 48);
  const top = ring.map(([x, y]) => at([x, y, z + key.thick]));
  const bottom = ring.map(([x, y]) => at([x, y, z]));
  const through = clipConvex(bottom, top);
  return `<path class="iso-shade" data-shade="0" d="${k.pathOf(top, true)}"/><path class="iso-shade" data-shade="3" d="${k.pathOf(through, true)}"/>` + L(k.pathOf(top, true), { tone: "lo" });
}

// every element of a solid always present, so live code can rewrite it
function liveSolid(paths, { tone = "hi", crease = "faint", lit = false } = {}) {
  const shade = (i) => `<path class="iso-shade" data-shade="${i}" data-k="s${i}" d="${paths.shades[i] || ""}"/>`;
  return `<g class="iso-solid"${lit ? " data-lit" : ""}><path class="iso-fill" data-k="fill" d="${paths.fill}"/>${[0, 1, 2, 3].map(shade).join("")}<path class="iso-top" data-k="top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="${crease}" data-k="crease" d="${paths.crease}"/><path class="iso-line iso-edge" data-tone="${tone}" data-k="outline" d="${paths.outline}"/></g>`;
}

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
  // travel scale in front of the rails
  const strip = { x: -104, y: 34, w: 150, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 3, 5, strip.y, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 4.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 4.5, 0.6])], { size: 0.45 }));
  // label plate
  const plate = { x: 62, y: 32, w: 36, d: 22, r: 1.5 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([plate.x + 6, plate.y + 6 + row * 2.4], [plate.x + (row === 1 ? 22 : 30), plate.y + 6 + row * 2.4], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([plate.x + 3.4, plate.y + plate.d / 2, 0.8]), at([plate.x + plate.w - 3.4, plate.y + plate.d / 2, 0.8])], { size: 0.45 }));
  // rails with end stops
  for (const y of RAILS) {
    out.push(S(k.slabOf({ x: RAIL_X[0], y: y - 2.5, w: RAIL_X[1] - RAIL_X[0], d: 5, r: 1 }, 0, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_X[0] + 5, -20, 40, RAIL_X[1] - 5].map((x) => at([x, y, 4])), { size: 0.4 }));
  }
  for (const x of [RAIL_X[0] - 5, RAIL_X[1]]) {
    out.push(S(k.slabOf({ x, y: RAILS[0] - 5, w: 5, d: RAILS[1] - RAILS[0] + 10, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, RAILS[0] - 1, 8]), at([x + 2.5, RAILS[1] + 1, 8])], { size: 0.45 }));
  }
  return out.join("");
}

// ---------------------------------------------------------------- the machine body and heads
function body() {
  const out = [];
  const flange = k.insetPlan(BODY, -3);
  out.push(`<path class="iso-halo" d="${k.haloOf(BODY, 0, BODY_TOP, P)}" style="opacity:.5"/>`);
  out.push(S(k.slabOf(flange, 0, 3, P, 4, 0.5), { tone: "lo" }));
  out.push(D([at([flange.x + 4, flange.y + flange.d - 1.6, 3]), at([flange.x + flange.w - 4, flange.y + flange.d - 1.6, 3]), at([flange.x + flange.w - 1.6, flange.y + 6, 3])], { size: 0.45 }));
  // vents on the side, as closed slots
  const side = BODY.x + BODY.w;
  const vents = [0, 1, 2, 3, 4].map((i) => {
    const y0 = BODY.y + 7 + i * 4;
    return k.pathOf([at([side, y0, 14]), at([side, y0 + 1.6, 14]), at([side, y0 + 1.6, 34]), at([side, y0, 34])], true);
  });
  const seam = k.sideSeam(BODY, 38, P, 4);
  out.push(S(k.slabOf(BODY, 3, BODY_TOP - 3, P, 4, 1.2), { tone: "mid", inner: L(seam, { tone: "faint" }) + L(vents.join(""), { tone: "lo" }) }));
  const lid = k.insetPlan(BODY, 3);
  out.push(L(k.planOutline(lid, BODY_TOP, P, 4), { tone: "faint" }));
  out.push(D(k.corners(lid, 2.4).map(([x, y]) => at([x, y, BODY_TOP])), { size: 0.45 }));
  // a tray of fresh blanks on the lid, ready for the next read
  const tray = { x: -62, y: -63, w: 76, d: 24, r: 2 };
  out.push(S(k.slabOf(tray, BODY_TOP, 1.6, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(tray, 2), BODY_TOP + 1.6, 0.3, P, 3), { tone: "lo", crease: "none" }));
  const spare = (ox, oy, flip) => {
    const key = { ...BLANK, origin: [ox, oy] };
    let ring = keyRing(key, -1);
    if (flip) ring = ring.map(([x, y]) => [2 * (ox + M.BLADE / 2) - x, y]).reverse();
    return k.extrude(ring, BODY_TOP + 1.9, BLANK.thick, P, { convex: false });
  };
  out.push(S(spare(tray.x + 19, tray.y + 3, false), { tone: "mid", crease: "faint" }) + holeSvg({ ...BLANK, origin: [tray.x + 19, tray.y + 3] }, BODY_TOP + 1.9));
  out.push(S(spare(tray.x + 5, tray.y + 13, true), { tone: "mid", crease: "faint" }) + holeSvg({ ...BLANK, origin: [tray.x + 5, tray.y + 13] }, BODY_TOP + 1.9, tray.x + 5 + M.BLADE / 2));
  // access panel on the front face
  const pz0 = 30, pz1 = 47, px0 = -26, px1 = 26;
  out.push(L(k.pathOf([at([px0, BODY_FRONT, pz0]), at([px1, BODY_FRONT, pz0]), at([px1, BODY_FRONT, pz1]), at([px0, BODY_FRONT, pz1])], true), { tone: "faint" }));
  out.push(D([[px0 + 2, pz0 + 2], [px1 - 2, pz0 + 2], [px0 + 2, pz1 - 2], [px1 - 2, pz1 - 2]].map(([x, z]) => at([x, BODY_FRONT, z])), { size: 0.42 }));
  // power switch on the front face, between the heads
  out.push(S(k.slabOf({ x: -10, y: BODY_FRONT, w: 20, d: 0.8, r: 0.5 }, 41, 7, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -2.2, y: BODY_FRONT + 0.8, w: 4.4, d: 1.2, r: 0.4 }, 42.4, 4.2, P, 2), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -1, y: BODY_FRONT + 2, w: 2, d: 2.6, r: 0.6 }, 44.6, 1.6, P, 2), { tone: "mid" }));
  out.push(D([at([-7.6, BODY_FRONT + 0.8, 44.5]), at([7.6, BODY_FRONT + 0.8, 44.5])], { size: 0.4 }));
  return out.join("");
}

function tracer() {
  const out = [];
  const arm = { x: XT - 7, y: BODY_FRONT, w: 14, d: YS + 2.6 - BODY_FRONT, r: 2 };
  const sx = XT;
  const sy = YS - STYLUS_R;
  // stylus: thin tip at key level, a shank, a collar under the arm
  out.push(S(k.cylinder(sx, sy, STYLUS_R, KZ - 2.5, 8.5, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(sx, sy, 1.7, KZ + 6, ARM_Z - 4 - KZ - 6, P, 20), { tone: "mid", crease: "none", inner: L(k.sideArc(sx, sy, 1.7, KZ + 10, P, 12), { tone: "faint" }) }));
  out.push(S(k.cylinder(sx, sy, 2.8, ARM_Z - 4, 4, P, 24, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf(arm, ARM_Z, ARM_TOP - ARM_Z, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(arm, 1.6), ARM_TOP, P, 3), { tone: "faint" }));
  // depth adjuster: knurled knob with an index line, and a lock screw on the arm's side
  out.push(S(k.cylinder(sx, sy, 3.8, ARM_TOP, 4, P, 32, 0.3), { tone: "mid" }));
  out.push(L(k.knurl(sx, sy, 3.8, ARM_TOP, ARM_TOP + 4, 28, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([sx, sy], [sx + 3.8, sy], ARM_TOP + 4, P), { tone: "hi" }));
  out.push(D([at([sx, sy, ARM_TOP + 4])], { size: 0.5, tone: "hi" }));
  out.push(S(k.slabOf({ x: arm.x + arm.w, y: sy - 1.2, w: 1.6, d: 2.4, r: 0.4 }, ARM_Z + 3, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(arm.x + arm.w + 3.4, sy, 1.9, ARM_Z + 1.6, 5.8, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(arm.x + arm.w + 3.4, sy, 1.9, ARM_Z + 1.6, ARM_Z + 7.4, 12, P, 0.3), { tone: "lo" }));
  out.push(D([at([arm.x + 3, arm.y + 4, ARM_TOP]), at([arm.x + arm.w - 3, arm.y + 4, ARM_TOP])], { size: 0.45 }));
  return out.join("");
}

function cutterHead() {
  const out = [];
  const [wx, wy] = WHEEL;
  const arm = { x: XC - 10, y: BODY_FRONT, w: 20, d: wy + 5 - BODY_FRONT, r: 2 };
  out.push(S(k.slabOf(arm, ARM_Z, ARM_TOP - ARM_Z, P, 3, 0.6), { tone: "mid" }));
  out.push(D([at([arm.x + 3, arm.y + 3, ARM_TOP]), at([arm.x + arm.w - 3, arm.y + 3, ARM_TOP])], { size: 0.45 }));
  // motor on top of the arm
  const mx = XC;
  const my = wy - 2;
  out.push(S(k.cylinder(mx, my, 9.6, ARM_TOP, 2.4, P, 48, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(mx, my, 8.8, ARM_TOP + 2.4, 17, P, 48), { tone: "mid", crease: "none", inner: L(k.knurl(mx, my, 8.8, ARM_TOP + 2.4, ARM_TOP + 19.4, 30, P, 0), { tone: "faint" }) }));
  out.push(S(k.cylinder(mx, my, 9.6, ARM_TOP + 19.4, 2.4, P, 48, 0.4), { tone: "mid" }));
  out.push(L(k.ring(mx, my, 6.4, ARM_TOP + 21.8, P, 40), { tone: "faint" }));
  out.push(D([0, 1, 2, 3].map((i) => at([mx + 7.8 * Math.cos(rad(45 + i * 90)), my + 7.8 * Math.sin(rad(45 + i * 90)), ARM_TOP + 21.8])), { size: 0.45 }));
  // terminal box on the motor's side
  out.push(S(k.slabOf({ x: mx + 8.2, y: my - 4, w: 4.4, d: 8, r: 0.8 }, ARM_TOP + 6, 8, P, 2, 0.3), { tone: "mid" }));
  out.push(D([at([mx + 12.6, my - 2, ARM_TOP + 12]), at([mx + 12.6, my + 2, ARM_TOP + 12])], { size: 0.4 }));
  return out.join("");
}

// the spindle and the wheel (drawn after the stylus row, before the carriage)
function wheel() {
  const out = [];
  const [wx, wy] = WHEEL;
  const top = WHEEL_Z + WHEEL_H;
  out.push(S(k.cylinder(wx, wy, 1.8, top + 1.6, ARM_Z - top - 1.6 - 3, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(wx, wy, 3.2, ARM_Z - 3, 3, P, 24, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(wx, wy, WHEEL_R, WHEEL_Z, WHEEL_H, P, 72, 0.4), { tone: "mid", inner: L(k.knurl(wx, wy, WHEEL_R, WHEEL_Z, top, 64, P, 0.25), { tone: "lo" }) }));
  // the teeth on the wheel's face turn with it
  const teeth = k.radialTicks(wx, wy, WHEEL_R - 0.4, 48, 4, top, [1.4, 2.6], P);
  out.push(`<g data-part="wheel-teeth">${L(teeth.minor, { tone: "lo" })}${L(teeth.major, { tone: "mid" })}</g>`);
  out.push(L(k.ring(wx, wy, WHEEL_R - 3.4, top, P, 56), { tone: "faint" }));
  out.push(S(k.cylinder(wx, wy, 3, top, 1.6, P, 6, 0.2), { tone: "mid" }));
  out.push(D([at([wx, wy, top + 1.6])], { size: 0.55, tone: "hi" }));
  return out.join("");
}

// ---------------------------------------------------------------- the carriage
function saddle() {
  const out = [];
  out.push(S(k.slabOf(SADDLE, SADDLE_Z, SADDLE_TOP - SADDLE_Z, P, 3, 0.5), { tone: "mid" }));
  out.push(D([SADDLE.x + 4, SADDLE.x + SADDLE.w - 4].flatMap((x) => [at([x, SADDLE.y + 3, SADDLE_TOP]), at([x, SADDLE.y + SADDLE.d - 3, SADDLE_TOP])]), { size: 0.45 }));
  // gibs: the table's guides along y
  for (const x of [TABLE.x - 1.6, TABLE.x + TABLE.w]) out.push(S(k.slabOf({ x, y: SADDLE.y + 1, w: 1.6, d: TABLE.d + 2, r: 0.3 }, SADDLE_TOP, 4, P, 2), { tone: "mid" }));
  return out.join("");
}

function springD(x, front) {
  const c = k.coil(TABLE_FRONT + front, POST_Y, [x, 11.5], 1.5, 4.5, "y", P);
  return c;
}

function saddleFront(cy) {
  const out = [];
  for (const x of SPRINGS) {
    const c = springD(x, cy);
    out.push(`<path class="iso-line" data-tone="lo" data-part="spring-back" d="${c.back}"/>`);
    out.push(S(k.slabOf({ x: x - 2.6, y: POST_Y, w: 5.2, d: 2.4, r: 0.6 }, SADDLE_TOP, 5, P, 2, 0.3), { tone: "mid" }));
    out.push(`<path class="iso-line" data-tone="mid" data-part="spring-front" d="${c.front}"/>`);
  }
  // the handle that runs the carriage, and its index on the scale
  const hx = 12;
  const hy = SADDLE.y + SADDLE.d - 4;
  out.push(S(k.cylinder(hx, hy, 2.6, SADDLE_TOP, 2, P, 20, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(hx, hy, 1.2, SADDLE_TOP + 2, 14, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(hx, hy, 3.4, SADDLE_TOP + 16, 5, P, 24, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(hx, hy, 3.4, SADDLE_TOP + 16, SADDLE_TOP + 21, 22, P, 0.3), { tone: "lo" }));
  const ix = -24;
  out.push(S(k.slabOf({ x: ix - 1.5, y: SADDLE.y + SADDLE.d, w: 3, d: 9.4, r: 0.4 }, SADDLE_Z + 1, 1, P, 2), { tone: "mid" }));
  out.push(L(k.lineOnTop([ix, SADDLE.y + SADDLE.d + 3], [ix, SADDLE.y + SADDLE.d + 9.4], SADDLE_Z + 2, P), { tone: "hi" }));
  return out.join("");
}

function vise(key, x0, x1) {
  const out = [];
  const plan = { x: x0, y: YS + 5, w: x1 - x0, d: TABLE_FRONT - 4 - YS - 5, r: 1.5 };
  const front = plan.y + plan.d;
  const jawLine = k.pathOf([at([x1, plan.y + 9, TABLE_TOP]), at([x1, plan.y + 9, KZ])]);
  out.push(S(k.slabOf(plan, TABLE_TOP, KZ - TABLE_TOP, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, TABLE_TOP + 2.2, P, 3), { tone: "faint" }) + L(jawLine, { tone: "faint" }) }));
  out.push(L(k.lineOnTop([x0, plan.y + 9], [x1, plan.y + 9], KZ, P), { tone: "faint" }));
  // the jaw screw: a boss on the front face and a knurled wheel
  for (const sx of [x0 + 12, x1 - 12]) {
    out.push(S(k.slabOf({ x: sx - 2.4, y: front, w: 4.8, d: 1.2, r: 0.6 }, TABLE_TOP + 3.4, 4.6, P, 3, 0.3), { tone: "mid" }));
    out.push(L(k.sideRing([sx, front + 1.2, TABLE_TOP + 5.7], 1.1, "y", P, 16), { tone: "lo" }));
  }
  out.push(D([at([x0 + 3, plan.y + plan.d - 2.5, KZ]), at([x1 - 3, plan.y + plan.d - 2.5, KZ])], { size: 0.45 }));
  // a fence the key's back edge rests against
  const fy = key.origin[1] + key.width + 0.2;
  out.push(S(k.slabOf({ x: key.origin[0] + 4, y: fy, w: M.BLADE - 10, d: 2, r: 0.4 }, KZ, key.thick, P, 2), { tone: "mid" }));
  out.push(D([at([key.origin[0] + 6, fy + 1, KZ + key.thick]), at([key.origin[0] + M.BLADE - 8, fy + 1, KZ + key.thick])], { size: 0.38 }));
  return out.join("");
}

function clamp(key) {
  const out = [];
  const [ox, oy] = key.origin;
  const z = KZ + key.thick;
  const bar = { x: ox - 2.6, y: oy - 3, w: 5.4, d: key.width + 9, r: 0.8 };
  out.push(S(k.slabOf(bar, z, 2.2, P, 2, 0.3), { tone: "mid" }));
  const kx = ox + 0.1;
  const ky = oy + key.width + 3.6;
  out.push(S(k.cylinder(kx, ky, 1.2, z + 2.2, 2.4, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(kx, ky, 3.4, z + 4.6, 3.6, P, 28, 0.3), { tone: "mid" }));
  out.push(L(k.knurl(kx, ky, 3.4, z + 4.6, z + 8.2, 22, P, 0.3), { tone: "lo" }));
  out.push(D([at([kx, ky, z + 8.2])], { size: 0.5, tone: "mid" }));
  out.push(D([at([bar.x + bar.w / 2, bar.y + 1.6, z + 2.2])], { size: 0.4 }));
  return out.join("");
}

function table() {
  const out = [];
  out.push(S(k.slabOf(TABLE, SADDLE_TOP, TABLE_TOP - SADDLE_TOP, P, 3, 0.5), { tone: "mid" }));
  out.push(D([TABLE.x + 6, TABLE.x + TABLE.w / 2, TABLE.x + TABLE.w - 6].map((x) => at([x, TABLE.y + TABLE.d - 2.4, TABLE_TOP])), { size: 0.4 }));
  // spring seats on the table's front face
  out.push(L(SPRINGS.map((x) => k.sideRing([x, TABLE_FRONT, 11.5], 1.5, "y", P, 20)).join(""), { tone: "lo" }));
  // master: the big file
  out.push(vise(MASTER, MASTER.origin[0] - 8, MASTER.origin[0] + M.BLADE + 2));
  const master = keySolid(MASTER, M.BLADE);
  out.push(`<g data-part="master">${S(master, { tone: "hi", crease: "lo" })}${holeSvg(MASTER)}</g>`);
  out.push(clamp(MASTER));
  // the blank: the skeleton being cut
  out.push(vise(BLANK, BLANK.origin[0] - 8, BLANK.origin[0] + M.BLADE + 2));
  out.push(`<g data-part="blank"><g data-part="blank-solid">${liveSolid(keySolid(BLANK, M.BLADE), { tone: "hi", lit: true })}</g>${holeSvg(BLANK)}</g>`);
  out.push(clamp(BLANK));
  return out.join("");
}

// ---------------------------------------------------------------- assemble
const LABEL =
  "A key-duplicating machine. A stylus rides the cut edge of a long, thick, heavily cut master key, the big file, and the cutting wheel copies that edge cut for cut onto a slim skeleton blank: the file's exact outline at a fraction of its size.";

const figureBody = [base(), machine()];
function machine() {
  return [
    body(),
    tracer(),
    cutterHead(),
    wheel(),
    `<g data-part="saddle" transform="${k.translateAlong(P, [REST_CX, 0, 0])}">${saddle()}</g>`,
    `<g data-part="table" transform="${k.translateAlong(P, [REST_CX, REST_CY, 0])}">${table()}</g>`,
    `<g data-part="saddle-front" transform="${k.translateAlong(P, [REST_CX, 0, 0])}">${saddleFront(REST_CY)}</g>`,
  ].join("");
}

const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: figureBody });
writeFileSync(join(WWW, "src", "figures", `${SLUG}.svg`), svg + "\n");

// ---------------------------------------------------------------- live
const DATA = {
  P,
  CUTS: M.CUTS,
  BLADE: M.BLADE,
  FULL: M.FULL_TOKENS,
  SKELETON: M.SKELETON_TOKENS,
  MS: M.OUTLINE_MS,
  T: { stroke: M.STROKE_SECONDS, hold: M.HOLD_SECONDS, back: M.RETURN_SECONDS, swap: M.SWAP_SECONDS },
  S_START,
  S_END,
  SHIFT,
  KZ,
  BLANK,
  WHEEL,
  WHEEL_TOP: WHEEL_Z + WHEEL_H,
  SPRINGS,
  TABLE_FRONT,
  POST_Y,
};

const LIVE = `
const D = ${JSON.stringify(DATA)};
const depthAt = ${M.depthAt.toString().replace("CUTS", "D.CUTS").replace(/BLADE/g, "D.BLADE").replace(/\bTIP\b/g, String(M.TIP)).replace(/\bFLAT\b/g, String(M.FLAT))};
const keyRing = ${keyRing.toString().replace(/M\.depthAt/g, "depthAt").replace(/M\.BLADE/g, "D.BLADE")};
const fmt = (n) => n.toLocaleString("en-US");
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function mount(root, { mode = "hover" } = {}) {
  const svg = root.querySelector("svg");
  if (!svg) return { destroy() {} };
  const P = D.P;
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const saddle = q("saddle"), table = q("table"), front = q("saddle-front"), blank = q("blank"), blankSolid = q("blank-solid"), teeth = q("wheel-teeth");
  const K = {};
  blankSolid.querySelectorAll("[data-k]").forEach((node) => (K[node.dataset.k] = node));
  const backs = [...front.querySelectorAll('[data-part="spring-back"]')], fronts = [...front.querySelectorAll('[data-part="spring-front"]')];
  const plate = root.closest(".iso-plate");
  const readout = (plate && plate.querySelector("[data-readout]")) || root.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  // the wheel turns in its own top plane: one affine map of that plane about the hub
  const ex = axisVector(P, [1, 0, 0]), ey = axisVector(P, [0, 1, 0]);
  const det = ex[0] * ey[1] - ey[0] * ex[1];
  const hub = iso([D.WHEEL[0], D.WHEEL[1], D.WHEEL_TOP], P);
  function spinOf(angle) {
    const c = Math.cos(angle), n = Math.sin(angle);
    const m = [ex[0] * c + ey[0] * n, ex[1] * c + ey[1] * n, -ex[0] * n + ey[0] * c, -ex[1] * n + ey[1] * c];
    const i0 = ey[1] / det, i1 = -ex[1] / det, i2 = -ey[0] / det, i3 = ex[0] / det;
    const a = m[0] * i0 + m[2] * i1, b = m[1] * i0 + m[3] * i1, cc = m[0] * i2 + m[2] * i3, d = m[1] * i2 + m[3] * i3;
    const f = (v) => Math.round(v * 10000) / 10000;
    return "matrix(" + [a, b, cc, d, hub[0] - a * hub[0] - cc * hub[1], hub[1] - b * hub[0] - d * hub[1]].map(f).join(" ") + ")";
  }

  const s = { phase: "hold", t: 0, u: 1, cut: 1, cx: D.SHIFT - D.S_END, cy: -depthAt(D.S_END), fast: 1, off: 0, lift: 0, alpha: 1, spin: 0, rpm: 0, cutDrawn: -1 };
  let frame = 0, last = 0, visible = false, idle = 0, touring = mode === "tour" && !still.matches, steering = false, pending = false, want = null;
  const say = (text) => { if (readout && readout.textContent !== text) readout.textContent = text; };
  const contact = (u) => D.S_START + (D.S_END - D.S_START) * u;
  const cxOf = (u) => D.SHIFT - contact(u);

  function drawBlank() {
    const cutTo = s.cut >= 1 ? D.BLADE : contact(s.cut);
    if (Math.abs(cutTo - s.cutDrawn) < 0.05) return;
    s.cutDrawn = cutTo;
    const paths = extrude(keyRing(D.BLANK, cutTo), D.KZ, D.BLANK.thick, P, { convex: false });
    K.fill.setAttribute("d", paths.fill); K.top.setAttribute("d", paths.top); K.crease.setAttribute("d", paths.crease); K.outline.setAttribute("d", paths.outline);
    for (let i = 0; i < 4; i++) K["s" + i].setAttribute("d", paths.shades[i] || "");
  }
  function draw() {
    const cy = s.cy + s.off;
    saddle.setAttribute("transform", translateAlong(P, [s.cx, 0, 0]));
    front.setAttribute("transform", translateAlong(P, [s.cx, 0, 0]));
    table.setAttribute("transform", translateAlong(P, [s.cx, cy, 0]));
    D.SPRINGS.forEach((x, i) => {
      const c = coil(D.TABLE_FRONT + cy, D.POST_Y, [x, 11.5], 1.5, 4.5, "y", P);
      backs[i].setAttribute("d", c.back); fronts[i].setAttribute("d", c.front);
    });
    blank.setAttribute("transform", translateAlong(P, [0, 0, s.lift]));
    blank.style.opacity = s.alpha < 1 ? String(s.alpha) : "";
    teeth.setAttribute("transform", spinOf(s.spin));
    drawBlank();
  }
  function text() {
    if (s.phase === "stroke") return "tracing · " + Math.round(D.SKELETON * s.cut) + " of " + D.SKELETON + " tok";
    if (s.phase === "hold" || s.phase === "back") return D.SKELETON + " of " + fmt(D.FULL) + " tok · " + D.MS;
    if (s.phase === "swap" || s.phase === "approach") return "fresh blank";
    return "master · " + fmt(D.FULL) + " tok";
  }
  function go(phase) { s.phase = phase; s.t = 0; }
  // place the carriage where the stylus sits on the master at progress u
  function place(u) { s.u = u; s.cx = cxOf(u); s.cy = -depthAt(contact(u)); }

  function step(dt) {
    dt *= s.fast;
    s.t += dt;
    const T = D.T;
    if (s.phase === "stroke") {
      const u = steering ? s.u + (want - s.u) * (1 - Math.exp(-dt / 0.25)) : ease(s.t / T.stroke);
      place(u);
      s.cut = Math.max(s.cut, u);
      if (!steering && s.t >= T.stroke) { go("hold"); s.fast = 1; }
    } else if (s.phase === "hold") {
      if (touring && s.t >= T.hold) go("back");
    } else if (s.phase === "back") {
      // back off the stylus, then run home
      const a = ease(s.t / 0.5);
      s.off = a * 3;
      const b = ease((s.t - 0.5) / T.back);
      s.cx = cxOf(s.u) + (cxOf(0) - cxOf(s.u)) * b;
      s.cy = -depthAt(contact(s.u)) * (1 - ease(s.t / 0.5));
      if (s.t >= 0.5 + T.back) { s.u = 0; s.cx = cxOf(0); s.cy = 0; go("swap"); }
    } else if (s.phase === "swap") {
      // the cut skeleton lifts out and a fresh blank goes in
      const h = T.swap / 2;
      if (s.t < h) { s.lift = ease(s.t / h) * 7; s.alpha = 1 - ease(s.t / h); }
      else { if (s.cut > 0) s.cut = 0; s.lift = (1 - ease((s.t - h) / h)) * 7; s.alpha = ease((s.t - h) / h); }
      if (s.t >= T.swap) { s.lift = 0; s.alpha = 1; go("approach"); }
    } else if (s.phase === "approach") {
      s.off = 3 * (1 - ease(s.t / 0.5));
      if (s.t >= 0.5) { s.off = 0; go(touring ? "pause" : "stroke"); if (pending) { steering = true; pending = false; } }
    } else if (s.phase === "pause") {
      if (s.t >= 1.2) go("stroke");
    }
    const motor = s.phase === "stroke" || s.phase === "hold" || s.phase === "pause" ? 1 : 0;
    s.rpm += (motor - s.rpm) * (1 - Math.exp(-dt / 0.6));
    s.spin -= s.rpm * dt * Math.PI * 1.2;
    return s.phase !== "hold" || touring || s.rpm > 0.002;
  }
  function snap() {
    // reduced motion: the finished cut, without travel
    place(1); s.cut = 1; s.off = 0; s.lift = 0; s.alpha = 1; s.rpm = 0; s.phase = "hold";
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    let moving;
    if (still.matches) { snap(); moving = false; } else moving = step(dt);
    draw();
    say(text());
    frame = visible && (moving || touring) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else if (frame) { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: "120px 0px" });
  io.observe(root);

  const handlers = [];
  const on = (node, type, fn) => { node.addEventListener(type, fn); handlers.push([node, type, fn]); };
  const leave = () => { steering = false; if (s.phase !== "hold") s.fast = 3; run(); };
  if (mode === "hover") {
    on(root, "pointerenter", () => { s.fast = 1; if (s.phase === "hold") go("back"); run(); });
    on(root, "pointerleave", leave);
  } else {
    const steer = (u) => {
      touring = false;
      want = Math.min(1, Math.max(0, u));
      clearTimeout(idle);
      idle = setTimeout(() => { steering = pending = false; touring = !still.matches; if (s.phase === "stroke") go("hold"); run(); }, 3600);
      if (s.phase === "stroke") steering = true;
      else if (s.phase === "hold" || s.phase === "pause") { go("stroke"); steering = true; }
      else pending = true; // backing off or changing the blank: take over once the new blank is in
      run();
    };
    on(root, "pointermove", (event) => {
      const box = svg.getBoundingClientRect();
      steer(((event.clientX - box.left) / box.width - 0.2) / 0.6);
    });
    on(root, "keydown", (event) => {
      const by = event.shiftKey ? 0.25 : 0.08;
      if (event.key === "ArrowRight") steer((want ?? s.u) + by);
      else if (event.key === "ArrowLeft") steer((want ?? s.u) - by);
      else return;
      event.preventDefault();
    });
  }
  draw();
  say(text());
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
import { iso, translateAlong, axisVector, extrude, coil } from "../../vendor/anatomy/kit/iso-kit.mjs";
${LIVE}`;
writeFileSync(join(WWW, "src", "figures", `${SLUG}.live.js`), MODULE);

// ---------------------------------------------------------------- previews
const script = kitScript() + LIVE.replace("export function mount", "function mount") + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
const plate = k.plateHtml({
  fig: "Fig 2",
  title: "context-broker",
  hint: "Move across to run the carriage",
  readout: `${M.SKELETON_TOKENS} of ${M.fmt(M.FULL_TOKENS)} tok · ${M.OUTLINE_MS}`,
  keys: [
    { mark: "lit", label: "Skeleton key: the file's exact outline, cut from the master" },
    { mark: "raised", label: "Master key: the big file, long, thick and heavily cut" },
  ],
  caption: `A stylus rides the master's cut edge and the wheel copies it, cut for cut, onto a slim blank. Nothing interprets the shape, so the copy is exact: ${M.SKELETON_TOKENS} tokens to read a ${M.fmt(M.FULL_TOKENS)}-token file, in about a millisecond, and ${M.SAVED_REPO}% fewer tokens across a whole monorepo.`,
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Key duplicator: move across or use the arrow keys to run the carriage past the stylus and the wheel">${svg}</div>`,
});
for (const theme of ["light", "dark"]) {
  const file = theme === "light" ? "preview-light.html" : "preview.html";
  writeFileSync(join(HERE, file), k.pageHtml({ title: "context-broker", theme, body: plate, script, width: 560 }));
}
console.log("wrote", `src/figures/${SLUG}.svg`, `src/figures/${SLUG}.live.js`, "preview-light.html", "preview.html", `· ${(svg.length / 1024).toFixed(1)} KB svg`);
