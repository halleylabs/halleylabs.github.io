// Tring: a desk telephone exchange. One punched card (the YAML agent contract) sits in a
// card reader; a rotary selector routes that same card to one of three jacks (the three
// runtimes). The card never changes while the selector turns.
//
// node build.mjs   writes ../../src/figures/tring.svg, ../../src/figures/tring.live.js,
//                  preview-light.html and preview.html (dark)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import { CARD_TEXT, CONTACT, DEFAULT_RUNTIME, ROW_COUNT, RUNTIMES, STOPS, punchesOf, readoutAt } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src", "figures");
mkdirSync(SRC, { recursive: true });

const WIDTH = 480;
const HEIGHT = 320;
const AZIMUTH = 52;

// ---------- world plan (z up, 1 unit about 1 px) ----------
const PLATE = { x: -120, y: -66, w: 240, d: 136, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const CASE = { x: -104, y: -50, w: 196, d: 70, r: 5 };
const PLINTH_H = 3;
const DECK = 24;
const FRONT = CASE.y + CASE.d; // y of the front face
const RIGHT = CASE.x + CASE.w; // x of the right face

const READER = { x: -96, y: -44, w: 60, d: 22, r: 3 };
const READER_TOP = DECK + 12;
const SLOT = { x: -93, y: -35.2, w: 48, d: 2.4, r: 1 };
const CARD = { x: -92, y: -34.6, w: 46, d: 1.2, r: 0.4 };
const CARD_TOP = READER_TOP + 34;
const CARD_FACE = CARD.y + CARD.d;
const LIP = { x: -94, y: -32.6, w: 50, d: 3, r: 1 };
const LIP_TOP = READER_TOP + 2.4;
const EJECT = [-40, -39];

const SX = -8;
const SY = -12;
const DISC_R = 22;
const DISC_TOP = DECK + 3;
const STUD_R = 14.5;
const WIPER = [[-2.8, -2.3], [STUD_R + 1.6, -0.9], [STUD_R + 2.9, 0], [STUD_R + 1.6, 0.9], [-2.8, 2.3], [-3.6, 0]];
const WIPER_Z = DISC_TOP + 1.8;
const WIPER_H = 1.2;
const KNOB_Z = WIPER_Z + WIPER_H;
const KNOB_TOP = KNOB_Z + 5.5;
const KNOB_R = 6.5;

const JACKS = [-44, -8, 28];
const JACK_Z = 12;

const HY = -10; // the handset lies along x
const FORKS = [61, 75];
const PEDESTAL = { x: 47, y: HY - 9, w: 42, d: 18, r: 3 };
const PEDESTAL_TOP = DECK + 6;
const FORK_TOP = 40;
const HANDLE = { x: 50, y: HY - 4, w: 36, d: 8, r: 2.5 };
const HANDLE_TOP = FORK_TOP + 4.5;
const ENDS = [{ x: 44, y: HY - 5, w: 12, d: 10, r: 3 }, { x: 80, y: HY - 5, w: 12, d: 10, r: 3 }];
const END_Z = 36;
const CUPS = [50, 86];
const CUP_R = 7;
const CUP_Z = 31.5;
const TAIL = { x: 92, y: HY - 2.5, w: 5, d: 5, r: 1.2 };
const COIL_C = [96, HY];
const COIL_R = 2.4;
const COIL_TOP = 37;
const RELIEF = { x: RIGHT, y: HY - 6, w: 8, d: 12, r: 2 };
const RELIEF_TOP = 10;

const BELLS = [[-84, 0], [-60, 0]];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [CARD.x, CARD.y, CARD_TOP],
    [CARD.x + CARD.w, CARD_FACE, CARD_TOP],
    [HANDLE.x, HANDLE.y, HANDLE_TOP],
    [COIL_C[0] + COIL_R, COIL_C[1], RELIEF_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const dirOf = (angle) => [Math.sin(angle), -Math.cos(angle)];
const closed = (points3) => k.pathOf(points3.map(at), true);

// A path on the vertical face x = const, from (y, z) points.
const onFaceX = (x, pts, isClosed = false) => k.pathOf(pts.map(([y, z]) => at([x, y, z])), isClosed);
const stadiumYZ = (y0, y1, zc, r, steps = 8) => {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI;
    out.push([y1 - r + Math.cos(a) * r, zc + Math.sin(a) * r]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 + (i / steps) * Math.PI;
    out.push([y0 + r + Math.cos(a) * r, zc + Math.sin(a) * r]);
  }
  return out;
};

// A coiled cord on a vertical axis, split into the half behind its axis and the half in front.
function helix(cx, cy, r, z0, z1, turns, perTurn = 24) {
  const [vx, vy] = k.towardViewer(P);
  const count = Math.round(turns * perTurn);
  const back = [];
  const front = [];
  let run = null;
  let side = null;
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * turns * Math.PI * 2 + 0.6;
    const nx = Math.cos(t);
    const ny = Math.sin(t);
    const z = z0 + (z1 - z0) * (i / count);
    const point = at([cx + nx * r, cy + ny * r, z]);
    const facing = nx * vx + ny * vy >= 0;
    if (facing !== side) {
      if (run) run.push(point);
      run = [point];
      (facing ? front : back).push(run);
      side = facing;
    } else run.push(point);
  }
  return { back: back.map((pts) => k.pathOf(pts)).join(""), front: front.map((pts) => k.pathOf(pts)).join("") };
}

// ---------- base ----------
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
  // label plate, front left
  const label = { x: -92, y: 40, w: 50, d: 13, r: 2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(
    L([0, 1, 2].map((row) => k.lineOnTop([label.x + 7, label.y + 4 + row * 2.5], [label.x + (row === 1 ? 30 : 40), label.y + 4 + row * 2.5], 0.8, P)).join(""), { tone: "lo", free: true }),
  );
  out.push(D([at([label.x + 3.4, label.y + label.d / 2, 0.8]), at([label.x + label.w - 3.4, label.y + label.d / 2, 0.8])], { size: 0.45 }));
  // ruler strip along the front edge
  const strip = { x: -20, y: PLATE.y + PLATE.d - 13, w: 118, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.4 }));
  return out.join("");
}

// ---------- exchange case ----------
function cabinet() {
  const out = [];
  out.push(S(k.slabOf(k.insetPlan(CASE, -1.5), 0, PLINTH_H, P, 8, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf(CASE, PLINTH_H, DECK - PLINTH_H, P, 8, 1.2), { tone: "mid", inner: L(k.sideSeam(CASE, DECK - 3, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(CASE, 4), DECK, P), { tone: "faint" }));
  const screws = k.corners(CASE, 8);
  out.push(D(screws.map(([x, y]) => at([x, y, DECK])), { size: 0.5 }));
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.8, DECK, P, 14)).join(""), { tone: "lo" }));
  // deck vents, back right
  for (let i = 0; i < 5; i++) out.push(L(k.planOutline({ x: 18 + i * 7, y: -44, w: 3, d: 18, r: 1.5 }, DECK, P, 4), { tone: "lo" }));
  // side vents on the right face
  for (let i = 0; i < 3; i++) out.push(L(onFaceX(RIGHT, stadiumYZ(-38, 8, 8 + i * 4.4, 1.2), true), { tone: "lo" }));
  return out.join("");
}

// ---------- card reader and the card ----------
function reader() {
  const out = [];
  out.push(S(k.slabOf(READER, DECK, READER_TOP - DECK, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(READER, DECK + 4, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(SLOT, READER_TOP, P, 4), { tone: "lo" }));
  const screws = k.corners(READER, 3.2);
  out.push(D(screws.map(([x, y]) => at([x, y, READER_TOP])), { size: 0.45 }));
  out.push(S(k.cylinder(EJECT[0], EJECT[1], 3.4, READER_TOP, 1, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(EJECT[0], EJECT[1], 2.4, READER_TOP + 1, 3.2, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(EJECT[0], EJECT[1], 2.4, READER_TOP + 1, READER_TOP + 4.2, 18, P), { tone: "lo" }));
  return out.join("");
}

function card() {
  const out = [];
  out.push(S(k.slabOf(CARD, READER_TOP, CARD_TOP - READER_TOP, P, 2), { tone: "hi", crease: "lo" }));
  const cols = [" ", ...CARD_TEXT, " ", " "];
  const pitch = CARD.w / (cols.length + 0.6);
  const x0 = CARD.x + pitch * 0.8;
  const rowPitch = 2.35;
  const zTop = CARD_TOP - 3.2;
  const holes = [];
  const printed = [];
  const punches = punchesOf(cols.join(""));
  cols.forEach((_, c) => {
    const x = x0 + c * pitch;
    for (let row = 0; row < ROW_COUNT; row++) {
      const z = zTop - row * rowPitch;
      if (punches[c].includes(row)) {
        holes.push(closed([[x - 0.55, CARD_FACE, z + 0.8], [x + 0.55, CARD_FACE, z + 0.8], [x + 0.55, CARD_FACE, z - 0.8], [x - 0.55, CARD_FACE, z - 0.8]]));
      } else if (row >= 2) printed.push(at([x, CARD_FACE, z]));
    }
  });
  out.push(D(printed, { size: 0.22, tone: "faint" }));
  out.push(`<path class="iso-line" data-tone="mid" style="fill:var(--anatomy-mid)" d="${holes.join("")}"/>`);
  return out.join("");
}

function lip() {
  const out = [];
  out.push(S(k.slabOf(LIP, READER_TOP, LIP_TOP - READER_TOP, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([LIP.x + 2.2, LIP.y + LIP.d / 2, LIP_TOP]), at([LIP.x + LIP.w - 2.2, LIP.y + LIP.d / 2, LIP_TOP])], { size: 0.4 }));
  return out.join("");
}

// ---------- routes engraved in the deck ----------
const routeOf = (index) => {
  const [dx, dy] = dirOf(STOPS[index]);
  const from = [SX + dx * (DISC_R - 2), SY + dy * (DISC_R - 2)];
  const bend = [SX + dx * (DISC_R + 3), SY + dy * (DISC_R + 3)];
  return k.onTop([from, bend, [JACKS[index], 8], [JACKS[index], FRONT]], DECK, P);
};

function deckRoutes() {
  const out = [];
  out.push(L(k.onTop([[-50, READER.y + READER.d], [-50, SY], [SX - DISC_R + 3, SY]], DECK, P), { tone: "mid" }));
  RUNTIMES.forEach((_, index) => out.push(`<path class="iso-line" data-part="route-${index}" data-tone="${index === DEFAULT_RUNTIME ? "hi" : "faint"}" d="${routeOf(index)}"/>`));
  return out.join("");
}

// ---------- the selector ----------
function selectorBase() {
  const out = [];
  out.push(S(k.cylinder(SX, SY, DISC_R + 1.5, DECK, 1, P, 64), { tone: "mid" }));
  out.push(S(k.cylinder(SX, SY, DISC_R, DECK + 1, DISC_TOP - DECK - 1, P, 64, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(SX, SY, DISC_R, DECK + 1, DISC_TOP, 72, P, 0.3), { tone: "faint" }));
  out.push(L(k.ring(SX, SY, DISC_R - 1.2, DISC_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(SX, SY, DISC_R - 1.2, 12, 6, DISC_TOP, [1.2, 2.6], P, STOPS[2], STOPS[0] - STOPS[2]);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  STOPS.forEach((angle) => {
    const [dx, dy] = dirOf(angle);
    out.push(S(k.cylinder(SX + dx * STUD_R, SY + dy * STUD_R, 1.7, DISC_TOP, 1.6, P, 16), { tone: "hi", crease: "lo" }));
  });
  out.push(S(k.cylinder(SX, SY, 3.6, DISC_TOP, WIPER_Z - DISC_TOP, P, 20), { tone: "mid" }));
  // three mounting screws on the disc, back half
  const screws = [0.1, 0.42, -0.26].map((turn) => {
    const [dx, dy] = dirOf(turn * Math.PI * 2);
    return at([SX + dx * 9, SY + dy * 9, DISC_TOP]);
  });
  out.push(D(screws, { size: 0.45 }));
  return out.join("");
}

const wiperRing = (angle) => {
  const [dx, dy] = dirOf(angle);
  const nx = -dy;
  const ny = dx;
  return WIPER.map(([s, n]) => [SX + dx * s + nx * n, SY + dy * s + ny * n]);
};
const indexLine = (angle) => {
  const [dx, dy] = dirOf(angle);
  return k.lineOnTop([SX + dx * 1.4, SY + dy * 1.4], [SX + dx * (KNOB_R - 1.2), SY + dy * (KNOB_R - 1.2)], KNOB_TOP, P);
};

// A solid whose paths are rewritten every frame: every path is always present.
function liveSolid(paths, part) {
  const shades = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${paths.shades[i] || ""}"/>`).join("");
  return `<g class="iso-solid" data-lit="" data-part="${part}"><path class="iso-fill" d="${paths.fill}"/>${shades}<path class="iso-top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="faint" d="${paths.crease}"/><path class="iso-line iso-edge" data-tone="hi" d="${paths.outline}"/></g>`;
}

function selectorTop(angle) {
  const out = [];
  out.push(liveSolid(k.extrude(wiperRing(angle), WIPER_Z, WIPER_H, P), "wiper"));
  out.push(S(k.cylinder(SX, SY, KNOB_R, KNOB_Z, KNOB_TOP - KNOB_Z, P, 36, 0.5), { tone: "mid" }));
  out.push(L(k.knurl(SX, SY, KNOB_R, KNOB_Z, KNOB_TOP - 1.2, 40, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(SX, SY, KNOB_R, KNOB_TOP - 1.2, P, 24), { tone: "faint" }));
  out.push(L(k.ring(SX, SY, KNOB_R - 1, KNOB_TOP, P, 36), { tone: "faint" }));
  out.push(`<path data-part="index" class="iso-line" data-tone="lit" data-free="end" d="${indexLine(angle)}" style="stroke-width:1"/>`);
  out.push(D([at([SX, SY, KNOB_TOP])], { size: 0.55, tone: "lit" }));
  return out.join("");
}

// ---------- jacks on the front face ----------
function jacks() {
  const out = [];
  const strip = { x: JACKS[0] - 10, y: FRONT, w: JACKS[2] - JACKS[0] + 20, d: 0.8, r: 0.3 };
  out.push(S(k.slabOf(strip, 18.6, 2.6, P, 2), { tone: "mid", crease: "none" }));
  const sf = FRONT + 0.8;
  out.push(D([at([strip.x + 2, sf, 19.9]), at([strip.x + strip.w - 2, sf, 19.9])], { size: 0.38 }));
  JACKS.forEach((x) => out.push(L(closed([[x - 3.2, sf, 20.6], [x + 3.2, sf, 20.6], [x + 3.2, sf, 19.2], [x - 3.2, sf, 19.2]]), { tone: "lo" })));
  JACKS.forEach((x, index) => {
    const plate = { x: x - 4.5, y: FRONT, w: 9, d: 1.4, r: 0.6 };
    out.push(S(k.slabOf(plate, 6, 12, P, 2, 0.3), { tone: "mid" }));
    const face = FRONT + 1.4;
    out.push(`<path class="iso-line" data-tone="lo" style="fill:var(--anatomy-shade-0)" d="${k.sideRing([x, face, JACK_Z], 2.3, "y", P, 24)}"/>`);
    out.push(`<path data-part="jack-${index}" class="iso-line" data-tone="${index === DEFAULT_RUNTIME ? "hi" : "lo"}" style="fill:var(--anatomy-lo)" d="${k.sideRing([x, face, JACK_Z], 1.3, "y", P, 18)}"/>`);
    out.push(D([at([x, face, 7.4]), at([x, face, 16.6])], { size: 0.42 }));
  });
  return out.join("");
}

// ---------- the handset on its cradle ----------
function fork(x, half) {
  const out = [];
  if (half === "back") {
    out.push(S(k.cylinder(x, HY, 3.6, PEDESTAL_TOP, 1.2, P, 24), { tone: "mid" }));
    out.push(S(k.cylinder(x, HY, 2.2, PEDESTAL_TOP + 1.2, FORK_TOP - 3 - PEDESTAL_TOP - 1.2, P, 20), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: x - 2, y: HY - 7.5, w: 4, d: 15, r: 1 }, FORK_TOP - 3, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 2, y: HY - 7.5, w: 4, d: 3, r: 0.8 }, FORK_TOP, 2.6, P, 3), { tone: "mid" }));
  } else {
    out.push(S(k.slabOf({ x: x - 2, y: HY + 4.5, w: 4, d: 3, r: 0.8 }, FORK_TOP, 2.6, P, 3), { tone: "mid" }));
  }
  return out.join("");
}

function pedestal() {
  const out = [];
  out.push(S(k.slabOf(PEDESTAL, DECK, PEDESTAL_TOP - DECK, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(PEDESTAL, DECK + 2, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PEDESTAL, 2.4), PEDESTAL_TOP, P, 4), { tone: "faint" }));
  out.push(D(k.corners(PEDESTAL, 4.4).map(([x, y]) => at([x, y, PEDESTAL_TOP])), { size: 0.42 }));
  // hook switch plunger between the forks
  out.push(S(k.cylinder((FORKS[0] + FORKS[1]) / 2, HY, 1.8, PEDESTAL_TOP, 2.4, P, 16), { tone: "mid" }));
  return out.join("");
}

function cup(x) {
  const out = [];
  out.push(S(k.cylinder(x, HY, CUP_R, CUP_Z, END_Z - CUP_Z, P, 40, 0.4), { tone: "mid" }));
  out.push(L(k.sideArc(x, HY, CUP_R, CUP_Z + 1.6, P, 24), { tone: "faint" }));
  return out.join("");
}

function handset() {
  const out = [];
  for (const end of ENDS) {
    out.push(S(k.slabOf(end, END_Z, HANDLE_TOP - END_Z, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(end, END_Z + 2, P, 4), { tone: "faint" }) }));
  }
  out.push(S(k.slabOf(HANDLE, FORK_TOP, HANDLE_TOP - FORK_TOP, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.lineOnTop([ENDS[0].x + ENDS[0].w, HY], [ENDS[1].x, HY], HANDLE_TOP, P), { tone: "faint" }));
  out.push(D(ENDS.map((end) => at([end.x + end.w / 2, HY, HANDLE_TOP])), { size: 0.5 }));
  return out.join("");
}

function cord() {
  const out = [];
  const c = helix(COIL_C[0], COIL_C[1], COIL_R, RELIEF_TOP, COIL_TOP, 10);
  out.push(L(c.back, { tone: "lo" }));
  out.push(L(c.front, { tone: "mid" }));
  out.push(S(k.slabOf({ x: ENDS[1].x + ENDS[1].w, y: HY - 2.5, w: COIL_C[0] - ENDS[1].x - ENDS[1].w + 2.5, d: 5, r: 1.2 }, COIL_TOP, 3.5, P, 3, 0.3), { tone: "mid" }));
  return out.join("");
}

function relief() {
  const out = [];
  out.push(S(k.slabOf({ ...RELIEF, w: COIL_C[0] - RIGHT + 4 }, PLINTH_H, RELIEF_TOP - PLINTH_H, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.ring(COIL_C[0], COIL_C[1], COIL_R, RELIEF_TOP, P, 20), { tone: "lo" }));
  out.push(D([at([RIGHT + 2, RELIEF.y + 2, RELIEF_TOP]), at([RIGHT + 2, RELIEF.y + RELIEF.d - 2, RELIEF_TOP])], { size: 0.42 }));
  return out.join("");
}

// ---------- the ringer: two gongs and a clapper ----------
function bell([x, y]) {
  const out = [];
  out.push(S(k.cylinder(x, y, 2.4, DECK, 2, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 8, DECK + 2, 1.6, P, 48, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 7, DECK + 3.6, 1.8, P, 44), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, 5.2, DECK + 5.4, 1.6, P, 36), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, 3, DECK + 7, 1.2, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 1.4, DECK + 8.2, 1.2, P, 16), { tone: "mid" }));
  return out.join("");
}

function ringer() {
  const out = [];
  const mid = (BELLS[0][0] + BELLS[1][0]) / 2;
  const post = { x: mid - 2, y: BELLS[0][1] - 9.5, w: 4, d: 4, r: 1 };
  out.push(S(k.slabOf({ x: mid - 7, y: post.y - 1.5, w: 14, d: 7, r: 1.5 }, DECK, 2.4, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([mid - 5, post.y + 2, DECK + 2.4]), at([mid + 5, post.y + 2, DECK + 2.4])], { size: 0.4 }));
  out.push(S(k.slabOf(post, DECK + 2.4, 8, P, 3, 0.3), { tone: "mid" }));
  out.push(byDepth(BELLS).map(bell).join(""));
  // clapper arm reaching between the gongs
  out.push(S(k.slabOf({ x: mid - 0.8, y: post.y + 3, w: 1.6, d: 8, r: 0.6 }, DECK + 8.4, 1.2, P, 2), { tone: "mid" }));
  out.push(S(k.cylinder(mid, BELLS[0][1] + 1.6, 1.8, DECK + 6.8, 3.6, P, 16), { tone: "mid" }));
  return out.join("");
}

const REST = STOPS[DEFAULT_RUNTIME];
const LABEL =
  "A small desk telephone exchange. One punched card, the agent written once in YAML, stands in a card reader. A rotary selector with a wiper routes that same card to one of three jacks on the front: cascade, speech-to-speech or hybrid. A handset rests on its cradle with a coiled cord. The card never changes while the selector turns.";

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: LABEL,
  body: [
    base(),
    cabinet(),
    deckRoutes(),
    reader(),
    card(),
    lip(),
    selectorBase(),
    selectorTop(REST),
    ringer(),
    pedestal(),
    cup(CUPS[0]),
    fork(FORKS[0], "back"),
    fork(FORKS[1], "back"),
    cup(CUPS[1]),
    handset(),
    fork(FORKS[0], "front"),
    fork(FORKS[1], "front"),
    jacks(),
    relief(),
    cord(),
  ],
});

// ---------- live behaviour ----------
const LIVE_DATA = {
  P,
  STOPS,
  CONTACT,
  SX,
  SY,
  KNOB_R,
  KNOB_TOP,
  WIPER,
  WIPER_Z,
  WIPER_H,
  READOUTS: RUNTIMES.map((_, index) => readoutAt(index)),
  SWITCHING: readoutAt(-1),
  REST: DEFAULT_RUNTIME,
};

const LIVE = `
const T = ${JSON.stringify(LIVE_DATA)};

export function mount(root, { mode = "hover" } = {}) {
  const svg = root.querySelector("svg");
  const q = (part) => svg.querySelector('[data-part="' + part + '"]');
  const wiper = q("wiper");
  const wiperPaths = {
    fill: wiper.querySelector(".iso-fill"),
    shades: [...wiper.querySelectorAll(".iso-shade")],
    top: wiper.querySelector(".iso-top"),
    crease: wiper.querySelector(".iso-crease"),
    edge: wiper.querySelector(".iso-edge"),
  };
  const index = q("index");
  const routes = T.STOPS.map((_, i) => q("route-" + i));
  const jacks = T.STOPS.map((_, i) => q("jack-" + i));
  const plate = root.closest(".iso-plate") || root;
  const readout = plate.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const dirOf = (a) => [Math.sin(a), -Math.cos(a)];
  const wiperRing = (a) => {
    const [dx, dy] = dirOf(a);
    const nx = -dy, ny = dx;
    return T.WIPER.map(([s, n]) => [T.SX + dx * s + nx * n, T.SY + dy * s + ny * n]);
  };

  const state = { angle: T.STOPS[T.REST], rate: 0, target: T.REST, contact: T.REST };
  let frame = 0, last = 0, clock = 0, visible = false, hovering = false, touring = mode === "tour", idle = 0, drawn = null;

  function contactAt(a) {
    for (let i = 0; i < T.STOPS.length; i++) if (Math.abs(a - T.STOPS[i]) < T.CONTACT) return i;
    return -1;
  }
  function draw() {
    if (drawn !== state.angle) {
      const p = extrude(wiperRing(state.angle), T.WIPER_Z, T.WIPER_H, T.P);
      wiperPaths.fill.setAttribute("d", p.fill);
      wiperPaths.shades.forEach((el, i) => el.setAttribute("d", p.shades[i] || ""));
      wiperPaths.top.setAttribute("d", p.top);
      wiperPaths.crease.setAttribute("d", p.crease);
      wiperPaths.edge.setAttribute("d", p.outline);
      const [dx, dy] = dirOf(state.angle);
      index.setAttribute("d", lineOnTop([T.SX + dx * 1.4, T.SY + dy * 1.4], [T.SX + dx * (T.KNOB_R - 1.2), T.SY + dy * (T.KNOB_R - 1.2)], T.KNOB_TOP, T.P));
      drawn = state.angle;
    }
    const c = contactAt(state.angle);
    if (c !== state.contact) {
      state.contact = c;
      routes.forEach((el, i) => el.setAttribute("data-tone", i === c ? "hi" : "faint"));
      jacks.forEach((el, i) => el.setAttribute("data-tone", i === c ? "hi" : "lo"));
      const text = c < 0 ? T.SWITCHING : T.READOUTS[c];
      if (readout && readout.textContent !== text) readout.textContent = text;
      if (mode === "tour" && c >= 0) root.setAttribute("aria-valuetext", T.READOUTS[c]);
    }
  }

  // hover plays 0 -> 1 -> 2 -> 1 -> 0 calmly; the tour loops the same walk
  const WALK = [0, 1, 2, 1];
  const DWELL = 1.5;
  const walkAt = (t) => WALK[Math.floor(t / DWELL) % WALK.length];

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if ((mode === "hover" && hovering) || (mode === "tour" && touring)) {
      clock += dt;
      state.target = walkAt(clock);
    }
    const goal = T.STOPS[state.target];
    if (calm) { state.angle = goal; state.rate = 0; }
    else {
      for (let i = 0; i < 4; i++) {
        const h = dt / 4;
        state.rate += ((goal - state.angle) * 46 - state.rate * 10) * h;
        state.angle += state.rate * h;
      }
      if (Math.abs(goal - state.angle) < 2e-4 && Math.abs(state.rate) < 2e-4) { state.angle = goal; state.rate = 0; }
    }
    draw();
    const settled = state.angle === goal && state.rate === 0 && !(mode === "hover" && hovering) && !(mode === "tour" && touring);
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
  const steer = (i) => {
    touring = false;
    state.target = Math.max(0, Math.min(T.STOPS.length - 1, i));
    clearTimeout(idle);
    idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
    run();
  };

  if (mode === "hover") {
    on(root, "pointerenter", () => { if (still.matches) return; hovering = true; clock = 0; run(); });
    on(root, "pointerleave", () => { hovering = false; state.target = T.REST; run(); });
  } else {
    if (still.matches) touring = false;
    if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "0");
    on(root, "pointermove", (event) => {
      const box = svg.getBoundingClientRect();
      const share = (event.clientX - box.left) / box.width;
      steer(share < 0.4 ? 0 : share < 0.6 ? 1 : 2);
    });
    on(root, "keydown", (event) => {
      const here = state.target;
      let to = null;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") to = here + 1;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = here - 1;
      if (event.key === "Home") to = 0;
      if (event.key === "End") to = T.STOPS.length - 1;
      if (to === null) return;
      event.preventDefault();
      steer(to);
    });
    run();
  }
  draw();
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

const MODULE = `// Generated by www/figures/tring/build.mjs. Do not edit by hand.\nimport { extrude, lineOnTop } from "../../vendor/anatomy/kit/iso-kit.mjs";\n${LIVE}`;
writeFileSync(join(SRC, "tring.svg"), svg);
writeFileSync(join(SRC, "tring.live.js"), MODULE);

const inline = `${kitScript()}\n{\n${LIVE.replace("export function mount", "function mount")}\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n}\n`;
for (const theme of ["light", "dark"]) {
  const body = k.plateHtml({
    fig: "Fig 1",
    title: "Tring",
    hint: "Hover to turn the selector",
    readout: readoutAt(DEFAULT_RUNTIME),
    keys: [
      { mark: "lit", label: "Selector wiper: the config switch" },
      { mark: "raised", label: "One punched card, the YAML agent" },
    ],
    caption:
      "A desk telephone exchange. The agent is written once, as one punched card in the reader. The selector routes that same card to cascade, speech-to-speech or hybrid, so changing architecture is a config change. The default cascade runs on local open models at $0 per minute.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Tring exchange: arrow keys turn the selector between the three runtimes" aria-valuemin="0" aria-valuemax="2" aria-valuetext="${readoutAt(DEFAULT_RUNTIME)}">${svg}</div>`,
  });
  writeFileSync(join(HERE, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "Tring", theme, body, script: inline, width: 560 }));
}
console.log("wrote tring.svg, tring.live.js, preview-light.html, preview.html", `scale ${P.scale.toFixed(3)}`);
