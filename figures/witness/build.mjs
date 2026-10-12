// witness: a reel-to-reel deck spliced into the line between an agent and a model API.
// node build.mjs            writes src/figures/witness.svg, src/figures/witness.live.js, preview.html, preview-light.html
// node build.mjs --audit    also proves the geometry
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import * as A from "../../vendor/anatomy/kit/audit.mjs";
import { tubePieces, tubeSvg } from "../../vendor/anatomy/kit/tube.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import * as X from "./shapes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src", "figures");
mkdirSync(SRC, { recursive: true });

const W = 480;
const H = 320;
const AZIMUTH = 55;

const PLATE = { x: -130, y: -65, w: 260, d: 130, r: 9 };
const AG = { x: -124, y: -13, w: 26, d: 26, r: 3 };
const AGC = [-111, 0];
const DK = { x: -60, y: -44, w: 120, d: 88, r: 6 };
const MD = { x: 98, y: -13, w: 26, d: 26, r: 3 };
const MDC = X.METER.c;
const JACK_Z = 8;
const TOP = X.DECK_TOP;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), ...k.boxCorners(k.insetPlan(DK, 4), 0, 29)],
  W,
  H,
  { pad: 22, azimuth: AZIMUTH, elevation: 30 },
);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);

const R = A.recorder(P);
function put(name, ref, svg, shapes = [], { bias = 0, part = null } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, part });
}
const rec = (shape) => R.solid(shape);

// A solid whose paths the live code rewrites: always the same eight children.
function liveSolid(paths, { tone = "hi", crease = "faint", lit = false, part }) {
  const shades = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${paths.shades[i] || ""}"/>`).join("");
  return `<g class="iso-solid"${lit ? ' data-lit=""' : ""} data-part="${part}"><path class="iso-fill" d="${paths.fill}"/>${shades}<path class="iso-top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
}

const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screwsOn = (plan, inset, z, ring = 1.6) => {
  const pts = k.corners(plan, inset);
  return L(pts.map(([x, y]) => k.ring(x, y, ring, z, P, 14)).join(""), { tone: "lo" }) + D(pts.map(([x, y]) => at([x, y, z])), { size: 0.45 });
};

// ---------- base ----------
const back = [`<path class="iso-halo" d="${k.haloOf(PLATE, -17, 12, P)}"/>`];
byDepth(k.corners(PLATE, 22)).forEach(([x, y], i) => {
  put(`stand.flange${i}`, [x, y, -16], S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: "lo" }), [rec(A.cylinder(x, y, 7, -17, 1.6, { name: `stand.flange${i}` }))]);
  put(`stand.foot${i}`, [x, y, -14], S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: "mid" }), [rec(A.cylinder(x, y, 5.4, -15.4, 3.4, { name: `stand.foot${i}` }))]);
});
{
  const screws = k.corners(PLATE, 10);
  const svg =
    S(k.slabOf(PLATE, -12, 12, P, 8, 1.6), { tone: "mid" }) +
    L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }) +
    L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
    D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
  put("stand.plate", [0, 0, -6], svg, [rec(A.slab(PLATE, -12, 12, { name: "stand.plate" }))], { bias: -400 });
}
{
  const strip = { x: -108, y: PLATE.y + PLATE.d - 14, w: 216, d: 6, r: 1 };
  const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 3, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  const svg = S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
  put("stand.ruler", [0, strip.y + 3, 0.3], svg, [rec(A.slab(strip, 0, 0.6, { name: "stand.ruler" }, 3))]);
}

// ---------- jacks and plugs ----------
const HEX = Array.from({ length: 6 }, (_, i) => [2.7 * Math.cos((i * Math.PI) / 3 + Math.PI / 6), 2.7 * Math.sin((i * Math.PI) / 3 + Math.PI / 6)]);
const PLUG_END = 9.6;
function jack(name, owner, p, dir, cable) {
  const F = G.frameAlong(p, dir);
  const mid = (s) => G.add3(p, G.mul3(dir, s));
  put(`${name}.nut`, mid(0.6), S(G.prismOf(F, HEX, 0, 1.2, P), { tone: "mid" }), [rec(A.prism(F, HEX, 0, 1.2, { name: `${name}.nut`, owner }))], { bias: 0.05 });
  put(`${name}.sleeve`, mid(1.9), S(G.disc(1.2, 2.6, 1.9, F, P), { tone: "mid" }), [rec(A.disc(F, 1.2, 2.6, 1.9, { name: `${name}.sleeve`, owner }))], { bias: 0.1 });
  const grip = L([3.6, 4.6, 5.6].map((s) => G.arcOf(F, s, 2.3, P)).join(""), { tone: "faint" });
  put(`${name}.shell`, mid(4.6), S(G.disc(2.6, 6.6, 2.3, F, P), { tone: "mid", inner: grip }), [rec(A.disc(F, 2.6, 6.6, 2.3, { name: `${name}.shell`, owner }))], { bias: 0.15 });
  const boot = [[6.6, 1.95], [PLUG_END, 1.5]];
  put(`${name}.boot`, mid(8.1), S(G.solidOf(boot, F, P), { tone: "lo" }), [rec(A.solid(F, boot, { name: `${name}.boot`, owner }))], { bias: 0.2 });
  return mid(PLUG_END);
}

function cable(name, from, to) {
  const r = 1.25;
  const span = to[0] - from[0];
  const sag = 2.2;
  const pts = [from, [from[0] + span * 0.18, from[1], from[2]], [from[0] + span * 0.5, from[1], from[2] - sag], [from[0] + span * 0.82, to[1], to[2]], to];
  const route = G.fillet(pts, 4, 10, { P, tube: r });
  R.route(name, route, r, { limp: true });
  tubePieces(route, r, P, { maxLength: 10, spacing: 1 }).forEach((piece, index) =>
    put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { bias: 0.05 }),
  );
  R.items.filter((item) => item.name.startsWith(`${name}:`)).forEach((item, chunk) => ((item.route = name), (item.chunk = chunk)));
}

// ---------- agent: the call button ----------
{
  const o = "agent";
  [{ x: -115, y: -17.4, w: 8, d: 4.4, r: 1.2 }, { x: -115, y: 13, w: 8, d: 4.4, r: 1.2 }].forEach((tab, i) => {
    const cy = tab.y + (i ? 2.6 : 1.8);
    put(`agent.tab${i}`, [tab.x + 4, cy, 0.8], S(k.slabOf(tab, 0, 1.6, P, 3, 0.4), { tone: "lo" }) + L(k.ring(tab.x + 4, cy, 1.3, 1.6, P, 12), { tone: "lo" }) + D([at([tab.x + 4, cy, 1.6])], { size: 0.45 }), [rec(A.slab(tab, 0, 1.6, { name: `agent.tab${i}`, owner: o }, 3))]);
  });
  const seam = L(k.sideSeam(AG, 3.2, P, 5), { tone: "faint" });
  put("agent.box", [AGC[0], AGC[1], 6.5], S(k.slabOf(AG, 0, 13, P, 5, 0.8), { tone: "mid", inner: seam }) + screwsOn(AG, 3.6, 13, 1.3), [rec(A.slab(AG, 0, 13, { name: "agent.box", owner: o }, 5))]);
  put("agent.bezel", [AGC[0], AGC[1], 13.5], S(k.cylinder(AGC[0], AGC[1], 7.4, 13, 1, P, 48, 0.4), { tone: "lo" }), [rec(A.cylinder(AGC[0], AGC[1], 7.4, 13, 1, { name: "agent.bezel", owner: o }))]);
  put("agent.collar", [AGC[0], AGC[1], 15], S(k.cylinder(AGC[0], AGC[1], 4.6, 14, 2, P, 40), { tone: "mid", inner: L(k.knurl(AGC[0], AGC[1], 4.6, 14, 16, 30, P), { tone: "faint" }) }), [rec(A.cylinder(AGC[0], AGC[1], 4.6, 14, 2, { name: "agent.collar", owner: o }))]);
  put("agent.stem", [AGC[0], AGC[1], 17], S(k.cylinder(AGC[0], AGC[1], 3, 16, 2, P, 32), { tone: "mid", crease: "none" }), [rec(A.cylinder(AGC[0], AGC[1], 3, 16, 2, { name: "agent.stem", owner: o }))]);
  const cap =
    S(k.cylinder(AGC[0], AGC[1], 6, 18, 3, P, 56, 0.5), { tone: "hi", crease: "lo", inner: L(k.knurl(AGC[0], AGC[1], 6, 18, 20, 44, P, 0.3), { tone: "lo" }) }) +
    L(k.ring(AGC[0], AGC[1], 3.8, 21, P, 40), { tone: "faint" });
  put("agent.cap", [AGC[0], AGC[1], 19.5], cap, [rec(A.cylinder(AGC[0], AGC[1], 6, 18, 3, { name: "agent.cap", owner: o }))], { part: "button" });
}
const agentOut = jack("agent.jack", "agent", [AG.x + AG.w, 0, JACK_Z], [1, 0, 0], "cable.agent");

// ---------- the deck ----------
{
  const o = "deck";
  byDepth(k.corners(DK, 9)).forEach(([x, y], i) => put(`deck.foot${i}`, [x, y, 1], S(k.cylinder(x, y, 3.2, 0, 2, P, 24), { tone: "lo" }), [rec(A.cylinder(x, y, 3.2, 0, 2, { name: `deck.foot${i}`, owner: o }))]));
  const fy = DK.y + DK.d + 0.02;
  const slot = (x0, z0) => path3([[x0, fy, z0], [x0 + 1.4, fy, z0], [x0 + 1.4, fy, z0 + 5], [x0, fy, z0 + 5]], true);
  const vents = [];
  for (let x = -52; x <= -28; x += 4) vents.push(slot(x, 5));
  for (let x = 27; x <= 51; x += 4) vents.push(slot(x, 5));
  const seam = L(k.sideSeam(DK, 12.5, P, 6), { tone: "faint" });
  put("deck.case", [0, 0, 10], S(k.slabOf(DK, 2, 16, P, 6, 1), { tone: "mid", inner: seam + L(vents.join(""), { tone: "lo" }) }), [rec(A.slab(DK, 2, 16, { name: "deck.case", owner: o }, 6))], { bias: -60 });
  const TP = k.insetPlan(DK, 3);
  put("deck.top", [0, 0, 18.6], S(k.slabOf(TP, 18, 1.2, P, 6, 0.6), { tone: "mid" }) + screwsOn(TP, 4, TOP, 1.3), [rec(A.slab(TP, 18, 1.2, { name: "deck.top", owner: o }, 6))], { bias: -40 });
}

// Reels
const rest = M.packOf(M.TAPE.rest);
const restTurn = M.turnsOf(M.TAPE.rest);
function reel(key, c, packR, angle) {
  const o = `deck.reel.${key}`;
  const Rr = X.REEL;
  put(`${o}.table`, [c[0], c[1], 19.7], S(k.cylinder(c[0], c[1], Rr.table, TOP, Rr.flangeZ - TOP, P, 48), { tone: "lo" }), [rec(A.cylinder(c[0], c[1], Rr.table, TOP, Rr.flangeZ - TOP, { name: `${o}.table`, owner: o }))]);
  const marks = X.reelMarks(c, packR, angle, P);
  const holes = `<g class="iso-dots" data-tone="mid" data-part="holes-${key}">${X.holesSvg(marks.holes)}</g>`;
  put(`${o}.flange`, [c[0], c[1], 20.7], S(k.cylinder(c[0], c[1], Rr.flange, Rr.flangeZ, 1, P, 72, 0.5), { tone: "mid" }) + L(k.ring(c[0], c[1], Rr.flange - 2.2, Rr.flangeZ + 1, P, 72), { tone: "faint" }) + holes, [rec(A.cylinder(c[0], c[1], Rr.flange, Rr.flangeZ, 1, { name: `${o}.flange`, owner: o }))]);
  const pack = liveSolid(X.packPaths(c, packR, P), { tone: "hi", part: `pack-${key}` }) + L(X.hubRing(c, P), { tone: "faint" }) + `<path class="iso-line" data-tone="lo" data-part="splice-${key}" d="${marks.splice}"/>`;
  put(`${o}.pack`, [c[0], c[1], 24], pack, [rec(A.cylinder(c[0], c[1], packR, Rr.packZ, Rr.packTop - Rr.packZ, { name: `${o}.pack`, owner: o }))]);
  const cap = S(k.cylinder(c[0], c[1], Rr.cap, Rr.packTop, Rr.capTop - Rr.packTop, P, 40, 0.4), { tone: "mid" }) + `<path class="iso-line" data-tone="lo" data-part="spokes-${key}" d="${marks.spokes}"/>` + L(k.ring(c[0], c[1], 1.3, Rr.capTop, P, 16), { tone: "lo" }) + D([at([c[0], c[1], Rr.capTop])], { size: 0.5 });
  put(`${o}.cap`, [c[0], c[1], 27.6], cap, [rec(A.cylinder(c[0], c[1], Rr.cap, Rr.packTop, Rr.capTop - Rr.packTop, { name: `${o}.cap`, owner: o }))]);
}
reel("supply", X.SUPPLY, rest.supply, -restTurn.supply);
reel("takeup", X.TAKEUP, rest.takeup, -restTurn.takeup);

// Head block, guides, capstan
const HP = { x: -22, y: 12, w: 44, d: 8.6, r: 2 };
const HP_TOP = 20.6;
const HEAD_TOP = 31;
put("deck.headplate", [0, 16.3, 19.9], S(k.slabOf(HP, TOP, HP_TOP - TOP, P, 4, 0.4), { tone: "mid" }) + D([[-20, 13.6], [20, 13.6], [-13.5, 13.6], [7, 13.6]].map(([x, y]) => at([x, y, HP_TOP])), { size: 0.45 }), [rec(A.slab(HP, TOP, HP_TOP - TOP, { name: "deck.headplate", owner: "deck.heads" }, 4))]);
function head(name, x, style) {
  const plan = { x, y: X.FRONT_Y - 5, w: 6.4, d: 5, r: 1.2 };
  const gap = L(k.segment([x + 3.2, X.FRONT_Y, HP_TOP], [x + 3.2, X.FRONT_Y, HEAD_TOP], P), { tone: "lo" });
  const svg = S(k.slabOf(plan, HP_TOP, HEAD_TOP - HP_TOP, P, 4, 0.4), { ...style, inner: gap }) + L(k.planOutline(k.insetPlan(plan, 1.2), HEAD_TOP, P, 3), { tone: "faint" }) + D([at([x + 3.2, plan.y + 2.5, HEAD_TOP])], { size: 0.45 });
  put(name, [x + 3.2, plan.y + 2.5, 25], svg, [rec(A.slab(plan, HP_TOP, HEAD_TOP - HP_TOP, { name, owner: "deck.heads" }, 4))]);
}
head("deck.recordhead", -10.4, { tone: "mid" });
head("deck.playhead", -2.2, { tone: "hi", crease: "lo", lit: true });
function guide(name, c) {
  const o = name;
  const parts = [
    [2.4, HP_TOP, 1, "lo"],
    [X.ROLLER, X.TAPE_Z, X.TAPE_H, "mid"],
    [2.4, X.TAPE_Z + X.TAPE_H, 1, "lo"],
    [1, X.TAPE_Z + X.TAPE_H + 1, 0.8, "mid"],
  ];
  parts.forEach(([r, z, h, tone], i) => put(`${name}.${i}`, [c[0], c[1], z + h / 2], S(k.cylinder(c[0], c[1], r, z, h, P, 28), { tone, crease: i === 1 ? "none" : "faint" }), [rec(A.cylinder(c[0], c[1], r, z, h, { name: `${name}.${i}`, owner: o }))]));
}
guide("deck.guideL", X.GUIDE_L);
guide("deck.guideR", X.GUIDE_R);
const CAP = [9.5, X.FRONT_Y - 1];
put("deck.capstan.collar", [CAP[0], CAP[1], 21], S(k.cylinder(CAP[0], CAP[1], 2, HP_TOP, 0.8, P, 24), { tone: "lo" }), [rec(A.cylinder(CAP[0], CAP[1], 2, HP_TOP, 0.8, { name: "deck.capstan.collar", owner: "deck.capstan" }))]);
put("deck.capstan", [CAP[0], CAP[1], 25], S(k.cylinder(CAP[0], CAP[1], 1, HP_TOP + 0.8, 7.2, P, 20), { tone: "mid", crease: "none" }), [rec(A.cylinder(CAP[0], CAP[1], 1, HP_TOP + 0.8, 7.2, { name: "deck.capstan", owner: "deck.capstan" }))]);

// Tape
put("tape", [0, 6, 24], liveSolid(X.tapePaths(rest.supply, rest.takeup, P), { tone: "hi", part: "tape" }), [rec(A.extruded(X.tapeRing(rest.supply, rest.takeup), X.TAPE_Z, X.TAPE_H, { name: "tape", owner: "tape" }))]);

// Pinch roller on its slide (built engaged, drawn at rest pulled back)
const PINCH_TRAVEL = 2.5;
{
  const o = "deck.pinch";
  const rail = { x: CAP[0] - 3, y: 21.6, w: 6, d: 10, r: 1 };
  put("deck.pinch.rail", [CAP[0], 26.6, 19.7], S(k.slabOf(rail, TOP, 1, P, 3, 0.3), { tone: "lo" }) + D([at([CAP[0], 30.4, TOP + 1])], { size: 0.4 }), [rec(A.slab(rail, TOP, 1, { name: "deck.pinch.rail", owner: o }, 3))]);
  const rc = [CAP[0], X.FRONT_Y + X.TAPE_T + 2.8];
  const block = { x: CAP[0] - 2.5, y: 22, w: 5, d: 7, r: 1 };
  put("deck.pinch.block", [CAP[0], 25.5, 20.8], S(k.slabOf(block, TOP + 1, 1.2, P, 3, 0.3), { tone: "mid" }) + D([at([CAP[0], 27.8, TOP + 2.2])], { size: 0.4 }), [rec(A.slab(block, TOP + 1, 1.2, { name: "deck.pinch.block", owner: o }, 3))], { part: "pinch" });
  put("deck.pinch.roller", [rc[0], rc[1], 24], S(k.cylinder(rc[0], rc[1], 2.8, TOP + 2.2, 5, P, 40), { tone: "mid" }), [rec(A.cylinder(rc[0], rc[1], 2.8, TOP + 2.2, 5, { name: "deck.pinch.roller", owner: o }))], { part: "pinch" });
  put("deck.pinch.cap", [rc[0], rc[1], 27.8], S(k.cylinder(rc[0], rc[1], 1.5, TOP + 7.2, 0.8, P, 20), { tone: "mid" }) + L(k.ring(rc[0], rc[1], 0.7, TOP + 8, P, 12), { tone: "lo" }), [rec(A.cylinder(rc[0], rc[1], 1.5, TOP + 7.2, 0.8, { name: "deck.pinch.cap", owner: o }))], { part: "pinch" });
}

// Transport keys and the label plate
const KEYS = ["rew", "stop", "play", "rec"];
const KEY_TRAVEL = 1.4;
{
  const well = { x: -53.4, y: 28.6, w: 28.8, d: 10.8, r: 1.6 };
  put("deck.keywell", [-39, 34, TOP], L(k.planOutline(well, TOP, P, 3), { tone: "faint" }) + S(k.slabOf(k.insetPlan(well, 0.6), TOP, 0.3, P, 3), { tone: "lo", crease: "none" }), [rec(A.slab(k.insetPlan(well, 0.6), TOP, 0.3, { name: "deck.keywell", owner: "deck.keys" }, 3))]);
  KEYS.forEach((name, i) => {
    const x = -52 + i * 7;
    const plan = { x, y: 29.6, w: 5.6, d: 8.6, r: 1 };
    const z1 = TOP + 3.2;
    const cx = x + 2.8;
    const cy = 34.6;
    const glyph = {
      rew: path3([[cx + 0.2, cy - 1.4, z1], [cx - 1.2, cy, z1], [cx + 0.2, cy + 1.4, z1]], true) + path3([[cx + 1.6, cy - 1.4, z1], [cx + 0.2, cy, z1], [cx + 1.6, cy + 1.4, z1]], true),
      stop: k.planOutline({ x: cx - 1.1, y: cy - 1.1, w: 2.2, d: 2.2, r: 0 }, z1, P, 1),
      play: path3([[cx - 1, cy - 1.4, z1], [cx + 1.2, cy, z1], [cx - 1, cy + 1.4, z1]], true),
      rec: k.ring(cx, cy, 1.2, z1, P, 20),
    }[name];
    put(`deck.key.${name}`, [cx, cy, TOP + 1.6], S(k.slabOf(plan, TOP + 0.3, 2.9, P, 3, 0.4), { tone: "mid" }) + L(glyph, { tone: "lo" }), [rec(A.slab(plan, TOP + 0.3, 2.9, { name: `deck.key.${name}`, owner: "deck.keys" }, 3))], { part: `key-${name}` });
  });
  const lp = { x: 28, y: 29.6, w: 24, d: 8.6, r: 1 };
  const z = TOP + 0.6;
  const rules = [[0.62, 31.8], [0.86, 33.9], [0.5, 36]].map(([share, y]) => k.lineOnTop([lp.x + 4, y], [lp.x + 4 + (lp.w - 8) * share, y], z, P)).join("");
  put("deck.label", [40, 34, z], S(k.slabOf(lp, TOP, 0.6, P, 3, 0.3), { tone: "lo" }) + L(k.planOutline(k.insetPlan(lp, 1.4), z, P, 3), { tone: "faint" }) + L(rules, { tone: "lo", free: true }) + D([at([lp.x + 2, lp.y + 4.3, z]), at([lp.x + lp.w - 2, lp.y + 4.3, z])], { size: 0.4 }), [rec(A.slab(lp, TOP, 0.6, { name: "deck.label", owner: "deck" }, 3))]);
}
const deckIn = jack("deck.in", "deck", [DK.x, 0, JACK_Z], [-1, 0, 0], "cable.agent");
const deckOut = jack("deck.out", "deck", [DK.x + DK.w, 0, JACK_Z], [1, 0, 0], "cable.model");

// ---------- model: the meter that moves only when the model is paid ----------
{
  const o = "model";
  [{ x: 107, y: -17.4, w: 8, d: 4.4, r: 1.2 }, { x: 107, y: 13, w: 8, d: 4.4, r: 1.2 }].forEach((tab, i) => {
    const cy = tab.y + (i ? 2.6 : 1.8);
    put(`model.tab${i}`, [tab.x + 4, cy, 0.8], S(k.slabOf(tab, 0, 1.6, P, 3, 0.4), { tone: "lo" }) + L(k.ring(tab.x + 4, cy, 1.3, 1.6, P, 12), { tone: "lo" }) + D([at([tab.x + 4, cy, 1.6])], { size: 0.45 }), [rec(A.slab(tab, 0, 1.6, { name: `model.tab${i}`, owner: o }, 3))]);
  });
  const seam = L(k.sideSeam(MD, 3.2, P, 5), { tone: "faint" });
  put("model.box", [MDC[0], MDC[1], 5.5], S(k.slabOf(MD, 0, 11, P, 5, 0.8), { tone: "mid", inner: seam }) + screwsOn(MD, 3.2, 11, 1.2), [rec(A.slab(MD, 0, 11, { name: "model.box", owner: o }))]);
  const top = X.METER.top;
  const t = k.radialTicks(MDC[0], MDC[1], 9, 20, 5, top, [1.1, 2.2], P, (X.METER.from * Math.PI) / 180, (X.METER.span * Math.PI) / 180);
  const arcPts = Array.from({ length: 25 }, (_, i) => {
    const a = ((X.METER.from + (X.METER.span * i) / 24) * Math.PI) / 180;
    return [MDC[0] + Math.sin(a) * 9, MDC[1] - Math.cos(a) * 9];
  });
  const face =
    S(k.cylinder(MDC[0], MDC[1], 11, 11, 5, P, 72, 0.6), { tone: "hi", crease: "lo", inner: L(k.knurl(MDC[0], MDC[1], 11, 13.6, 16, 64, P, 0.3), { tone: "lo" }) + L(k.sideArc(MDC[0], MDC[1], 11, 13.6, P, 40), { tone: "faint" }) }) +
    L(k.ring(MDC[0], MDC[1], 9.8, top, P, 64), { tone: "lo" }) +
    L(k.onTop(arcPts, top, P), { tone: "lo" }) +
    L(t.minor, { tone: "lo" }) +
    L(t.major, { tone: "mid" }) +
    L(k.ring(MDC[0] + 0, MDC[1] + 6, 1, top, P, 14) + k.lineOnTop([MDC[0] - 1, MDC[1] + 6], [MDC[0] + 1, MDC[1] + 6], top, P), { tone: "lo" }) +
    L(k.ring(MDC[0], MDC[1], 1.2, top, P, 16), { tone: "mid" }) +
    `<path class="iso-line" data-tone="hi" data-free="" data-part="needle" style="stroke-width:1" d="${X.needlePath(0, P)}"/>`;
  put("model.meter", [MDC[0], MDC[1], 13.5], face, [rec(A.cylinder(MDC[0], MDC[1], 11, 11, 5, { name: "model.meter", owner: o }))]);
}
const modelIn = jack("model.jack", "model", [MD.x, 0, JACK_Z], [-1, 0, 0], "cable.model");

cable("cable.agent", agentOut, deckIn);
cable("cable.model", deckOut, modelIn);

// ---------- order, write ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const restAttr = { pinch: k.translateAlong(P, [0, PINCH_TRAVEL, 0]) };
const body = R.items.map((item) => (item.part ? `<g data-part="${item.part}"${restAttr[item.part] ? ` transform="${restAttr[item.part]}"` : ""}>${item.svg}</g>` : item.svg));
// soft halos under the deck and the two boxes, painted on the plate
const halos = [k.insetPlan(DK, 2), k.insetPlan(AG, 1), k.insetPlan(MD, 1)].map((plan) => `<path class="iso-halo" style="filter:blur(3px)" d="${k.haloOf(plan, 0, 0.1, P)}"/>`).join("");
body.splice(R.items.findIndex((item) => item.name === "stand.plate") + 1, 0, halos);

const LABEL =
  "A reel-to-reel tape deck spliced into a line between a call button on the agent's side and a meter on the model's side. A new call runs the line to the model, moves the meter and is recorded to tape. A repeat call is played back from the tape past the playback head while the meter stays still.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [...back, ...body] });
writeFileSync(join(SRC, "witness.svg"), svg);

// ---------- the live module ----------
const strip = (src) => src.replace(/^import .*$/gm, "").replace(/^export /gm, "");
const namesOf = (src) => [...src.matchAll(/^export (?:const|function) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
const shapesSrc = readFileSync(join(HERE, "shapes.mjs"), "utf8");
const modelSrc = readFileSync(join(HERE, "model.mjs"), "utf8");
const names = [...namesOf(shapesSrc), ...namesOf(modelSrc)];
const DATA = { P, pinch: PINCH_TRAVEL, key: KEY_TRAVEL, button: 2 };
const liveBody = readFileSync(join(HERE, "live.tpl.js"), "utf8")
  .replace("/*__LIB__*/", `const WT = (() => {\n${strip(shapesSrc)}\n${strip(modelSrc)}\nreturn { ${names.join(", ")} };\n})();`)
  .replace("/*__DATA__*/", `const DATA = ${JSON.stringify(DATA)};`);
const IMPORT = `import { cylinder, extrude, lineOnTop, ring, iso, pathOf, translateAlong } from "../../vendor/anatomy/kit/iso-kit.mjs";\n`;
writeFileSync(join(SRC, "witness.live.js"), IMPORT + liveBody);

// ---------- previews ----------
const inline = strip(liveBody) + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
for (const theme of ["light", "dark"]) {
  const plate = k.plateHtml({
    fig: "Fig 1",
    title: "Recording deck on the line",
    hint: "Click to call again",
    readout: M.REST_TEXT,
    keys: [
      { mark: "lit", label: "Playback head: a repeat call is read back from here" },
      { mark: "raised", label: "Tape: every call that reached the model, recorded" },
      { mark: "edge", label: "The line, from the agent's call button to the model's meter" },
    ],
    caption:
      "witness is spliced into the line between an agent and a model API, and the agent only changes its base URL. A new call runs the line to the model and is paid for: the meter holds for 803 ms, and recording it costs 0.25 ms more. Ask again and the deck plays the answer back from tape in 541 µs while the meter stays still. When a run crashes, the deck rewinds and replays the whole run with no model calls.",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="witness deck. Click or press Enter to repeat the call from tape; press N for a new call to the model.">${svg}</div>`,
  });
  writeFileSync(join(HERE, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "witness", theme, body: plate, script: kitScript() + inline }));
}
console.log("wrote witness.svg, witness.live.js, previews", `${R.items.length} items`, `${R.solids.length} solids`, `scale ${KS.toFixed(3)}`, `svg ${(svg.length / 1024).toFixed(0)} KB`);

A.auditOrExit(R, P, {});
