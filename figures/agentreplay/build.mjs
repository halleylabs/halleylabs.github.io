// AgentReplay: a player-piano roll reader. The frozen run is a punched roll; a comb of feeler
// fingers reads it; a send without approval trips the gate lever and the stop flag drops.
// node build.mjs            writes src/figures/agentreplay.svg, src/figures/agentreplay.live.js, preview.html, preview-light.html
// node build.mjs --audit    also proves the geometry
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";
import * as A from "../../vendor/anatomy/kit/audit.mjs";
import { kitScript } from "../../vendor/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import * as X from "./shapes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "src", "figures");
mkdirSync(SRC, { recursive: true });

const W = 480;
const H = 320;
const AZIMUTH = 55;
const PLATE = { x: -110, y: -67, w: 220, d: 130, r: 9 };
const TT = { x: -42, y: -36, w: 84, d: 64, r: 3 };
const TT_TOP = X.PAPER.z;
const BEAM = { x: -4, y: -37, w: 8, d: 66, r: 1.5 };
const BEAM_Z = 40;

const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), ...k.boxCorners({ x: -10, y: -10, w: 20, d: 20, r: 0 }, 0, 53)], W, H, { pad: 22, azimuth: AZIMUTH, elevation: 30 });
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

const R = A.recorder(P);
const put = (name, ref, svg, shapes = [], { bias = 0, part = null } = {}) => R.put({ name, at: ref, bias, svg, shapes, part });
const rec = (shape) => R.solid(shape);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screwsOn = (plan, inset, z, ring = 1.4) => {
  const pts = k.corners(plan, inset);
  return L(pts.map(([x, y]) => k.ring(x, y, ring, z, P, 14)).join(""), { tone: "lo" }) + D(pts.map(([x, y]) => at([x, y, z])), { size: 0.45 });
};
function liveSolid(paths, { tone = "hi", crease = "faint", lit = false, part }) {
  const shades = [0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${paths.shades[i] || ""}"/>`).join("");
  return `<g class="iso-solid"${lit ? ' data-lit=""' : ""} data-part="${part}"><path class="iso-fill" d="${paths.fill}"/>${shades}<path class="iso-top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>${paths.bevel !== undefined ? `<path class="iso-line iso-bevel" data-tone="${crease}" d="${paths.bevel || ""}"/>` : ""}<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
}
const cyl = (name, owner, c, r, z, h, style, opts = {}) =>
  put(name, [c[0], c[1], z + h / 2], S(k.cylinder(c[0], c[1], r, z, h, P, opts.steps ?? 28, opts.bevel ?? 0), style) + (opts.extra ?? ""), [rec(A.cylinder(c[0], c[1], r, z, h, { name, owner }))], { bias: opts.bias ?? 0, part: opts.part ?? null });
const slab = (name, owner, plan, z, h, style, opts = {}) =>
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, opts.steps ?? 4, opts.bevel ?? 0.4), style) + (opts.extra ?? ""), [rec(A.slab(plan, z, h, { name, owner }, opts.steps ?? 4))], { bias: opts.bias ?? 0, part: opts.part ?? null });

// ---------- base ----------
const back = [`<path class="iso-halo" d="${k.haloOf(PLATE, -17, 12, P)}"/>`];
byDepth(k.corners(PLATE, 22)).forEach(([x, y], i) => {
  cyl(`stand.flange${i}`, "stand", [x, y], 7, -17, 1.6, { tone: "lo" });
  cyl(`stand.foot${i}`, "stand", [x, y], 5.4, -15.4, 3.4, { tone: "mid" });
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
  const lp = { x: -98, y: 38, w: 30, d: 10, r: 1.2 };
  const z = 0.7;
  const rules = [[0.7, 41], [0.9, 43.2], [0.55, 45.4]].map(([share, y]) => k.lineOnTop([lp.x + 4, y], [lp.x + 4 + (lp.w - 8) * share, y], z, P)).join("");
  slab("stand.label", "stand", lp, 0, z, { tone: "lo" }, { steps: 3, bevel: 0.3, extra: L(k.planOutline(k.insetPlan(lp, 1.5), z, P, 3), { tone: "faint" }) + L(rules, { tone: "lo", free: true }) + D([at([lp.x + 2, lp.y + 5, z]), at([lp.x + lp.w - 2, lp.y + 5, z])], { size: 0.4 }) });
}

// ---------- reading table ----------
[-38, 26].forEach((x, i) => slab(`table.pedestal${i}`, "table", { x, y: -30, w: 12, d: 52, r: 2 }, 0, TT_TOP - 4, { tone: "mid" }, { bevel: 0.5, extra: L(k.sideSeam({ x, y: -30, w: 12, d: 52, r: 2 }, 3, P, 4), { tone: "faint" }) }));
{
  const strip = { x: -38, y: 24.6, w: 76, d: 3, r: 0.5 };
  const t = k.topTicks(strip.x + 1, strip.x + strip.w - 1, M.PITCH / 3, 3, strip.y, TT_TOP + 0.3, [1, 2], P);
  const top = S(k.slabOf(TT, TT_TOP - 4, 4, P, 4, 0.8), { tone: "mid" }) + screwsOn({ x: TT.x, y: -36, w: TT.w, d: 4, r: 0 }, 2, TT_TOP, 1) + S(k.slabOf(strip, TT_TOP, 0.3, P, 2), { tone: "lo", crease: "none" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" });
  put("table.top", [0, -4, TT_TOP - 2], top, [rec(A.slab(TT, TT_TOP - 4, 4, { name: "table.top", owner: "table" }, 4))], { bias: -50 });
}

// ---------- spools ----------
const AY = [0, 1, 0];
function spool(key) {
  const X0 = X.SPOOL_X[key];
  const o = `spool.${key}`;
  const F = (y) => G.frameAlong([X0, y, X.AXLE_Z], AY);
  const cheek = { x: X0 - 7, y: -44, w: 14, d: 5, r: 1.5 };
  slab(`${o}.cheek`, o, cheek, 0, 26, { tone: "mid" }, { bevel: 0.5, extra: D([at([X0 - 4, -42, 26]), at([X0 + 4, -42, 26])], { size: 0.45 }) });
  const disc = (name, s0, s1, r, style, extra = "") => {
    const Fr = F(0);
    put(name, [X0, (s0 + s1) / 2, X.AXLE_Z], S(G.disc(s0, s1, r, Fr, P), style) + extra, [rec(A.disc(Fr, s0, s1, r, { name, owner: o }))]);
  };
  disc(`${o}.axle`, -39, -33.4, 1.6, { tone: "mid" });
  disc(`${o}.flangeB`, -33.4, -32.4, X.FLANGE_R, { tone: "mid" });
  disc(`${o}.pack`, -32.4, 24.4, X.PACK_R, { tone: "hi", inner: L([-20, -8, 4, 16].map((s) => G.arcOf(F(0), s, X.PACK_R, P)).join(""), { tone: "faint" }) });
  const marks = X.spoolMarks(key, 0, P);
  const face = L(G.circleOf(F(0), X.FRONT_FLANGE, X.FLANGE_R - 1.4, P), { tone: "faint" }) + `<path class="iso-line" data-tone="lo" data-part="spokes-${key}" d="${marks.spokes}"/><path class="iso-line" data-tone="lo" data-part="windows-${key}" d="${marks.windows}"/>`;
  disc(`${o}.flangeF`, 24.4, X.FRONT_FLANGE, X.FLANGE_R, { tone: "mid", crease: "lo" }, face);
  const ribs = G.ribsOf(F(0), X.FRONT_FLANGE, X.FRONT_FLANGE + 2.2, 3, 24, P, { fade: [0.1, 0.55], seams: true });
  disc(`${o}.chuck`, X.FRONT_FLANGE, X.FRONT_FLANGE + 2.2, 3, { tone: "mid" }, k.fadedSvg(ribs, { tone: "lo" }) + L(G.circleOf(F(0), X.FRONT_FLANGE + 2.2, 1.2, P), { tone: "lo" }));
}
spool("supply");
spool("takeup");
{
  // the take-up motor, behind its cheek
  const o = "spool.takeup";
  const X0 = X.SPOOL_X.takeup;
  const F = G.frameAlong([X0, 0, X.AXLE_Z], AY);
  slab("motor.foot", o, { x: X0 - 7, y: -53, w: 14, d: 9, r: 1.5 }, 0, X.AXLE_Z - 7.2, { tone: "lo" }, { bevel: 0.4 });
  const ribs = G.ribsOf(F, -52, -46, 7.2, 36, P, { fade: [0.1, 0.55], seams: true });
  put("motor.can", [X0, -48.5, X.AXLE_Z], S(G.disc(-53, -44, 7.2, F, P), { tone: "mid" }) + k.fadedSvg(ribs, { tone: "lo" }), [rec(A.disc(F, -53, -44, 7.2, { name: "motor.can", owner: o }))]);
}

// ---------- the roll ----------
{
  const paper = { x: X.CLIP_X[0], y: X.PAPER.y0, w: X.CLIP_X[1] - X.CLIP_X[0], d: X.PAPER.y1 - X.PAPER.y0, r: 0 };
  const corners = [[paper.x, paper.y], [paper.x + paper.w, paper.y], [paper.x + paper.w, paper.y + paper.d], [paper.x, paper.y + paper.d]].map(([x, y]) => at([x, y, X.PAPER.top]));
  const clip = `<clipPath id="ar-roll"><path d="${k.pathOf(corners, true)}"/></clipPath>`;
  const holes = X.holesPath(0, P);
  const edge = L(k.lineOnTop([paper.x, paper.y + 5.2], [paper.x + paper.w, paper.y + 5.2], X.PAPER.top, P), { tone: "faint" });
  const svg =
    S(k.slabOf(paper, X.PAPER.z, X.PAPER.top - X.PAPER.z, P, 1), { tone: "hi", inner: "" }) +
    edge +
    `<defs>${clip}</defs><g clip-path="url(#ar-roll)"><path class="ar-hole" data-part="holes" d="${holes}" style="fill:var(--anatomy-shade-0);stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight);stroke-linejoin:round"/></g>`;
  put("roll.paper", [0, -4, 27.8], svg, [rec(A.slab(paper, X.PAPER.z, X.PAPER.top - X.PAPER.z, { name: "roll.paper", owner: "roll" }, 1))], { bias: 0.2 });
}

// ---------- the comb ----------
{
  const o = "comb";
  [[0, -34], [0, 26]].forEach((c, i) => {
    cyl(`comb.base${i}`, o, c, 3, TT_TOP, 1.2, { tone: "mid" }, { bevel: 0.3 });
    cyl(`comb.post${i}`, o, c, 1.8, TT_TOP + 1.2, BEAM_Z - TT_TOP - 1.2, { tone: "mid", crease: "none" }, { extra: L(k.sideArc(c[0], c[1], 1.8, 35, P, 12), { tone: "faint" }) });
  });
  slab("comb.beam", o, BEAM, BEAM_Z, X.BEAM_TOP - BEAM_Z, { tone: "mid" }, { bevel: 0.5, extra: D([[-2, -35], [2, -35], [-2, 27], [2, 27]].map(([x, y]) => at([x, y, X.BEAM_TOP])), { size: 0.45 }) });
  M.LANE_Y.forEach((y, i) => {
    const gate = i === M.GATE;
    const pinSvg = S(k.cylinder(0, y, 1, X.PAPER.top, 37 - X.PAPER.top, P, 18), { tone: gate ? "hi" : "mid", crease: "none" }) + S(k.cylinder(0, y, 1.8, 31, 1.2, P, 22), { tone: gate ? "hi" : "mid" });
    put(`comb.pin${i}`, [0, y, 32], pinSvg, [rec(A.cylinder(0, y, 1, X.PAPER.top, 37 - X.PAPER.top, { name: `comb.pin${i}`, owner: o })), rec(A.cylinder(0, y, 1.8, 31, 1.2, { name: `comb.collar${i}`, owner: o }))], { part: `pin${i}` });
    cyl(`comb.sleeve${i}`, o, [0, y], 2.1, 35, BEAM_Z - 35, { tone: "mid" }, { extra: L(k.sideArc(0, y, 2.1, 36.2, P, 12), { tone: "faint" }) });
  });
  // the gate finger carries on above the beam: a neck in a sleeve and a head that holds the lever's tail
  const gy = M.LANE_Y[M.GATE];
  {
    const F = G.frameOf([0, gy, X.BEAM_TOP + 2], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const rod = G.rodOut(F, 0, 48.9 - X.BEAM_TOP - 2, 0.9, P, { stroke: 1.9 });
    const svg = `<defs><clipPath id="ar-neck"><path data-hold d="${rod.clip}"/></clipPath></defs><g clip-path="url(#ar-neck)">${S(rod.paths, { tone: "hi", crease: "none" })}</g>`;
    put("gate.neck", [0, gy, 47.9], svg, [rec(A.slide(F, 0, rod.to, 0.9, { name: "gate.neck", owner: o }))], { part: `head${M.GATE}` });
  }
  cyl("gate.sleeve", o, [0, gy], 1.8, X.BEAM_TOP, 2, { tone: "mid" });
  cyl("gate.head", o, [0, gy], 2.4, 48.9, 3.2, { tone: "hi", crease: "lo" }, { bevel: 0.3, part: `head${M.GATE}`, extra: L(k.ring(0, gy, 1.1, 52.1, P, 14), { tone: "lo" }) });
  // bracket, pivot and the lever (lit)
  const bracket = { x: -4, y: 18, w: 16, d: 16, r: 1.5 };
  slab("gate.bracket", "gate", bracket, X.BEAM_TOP, 1.5, { tone: "mid" }, { bevel: 0.3, extra: D([at([-1.5, 20.5, X.BEAM_TOP + 1.5]), at([-1.5, 31.5, X.BEAM_TOP + 1.5])], { size: 0.4 }) });
  const pv = X.LEVER.pivot;
  cyl("gate.boss", "gate", pv, 2.2, X.BEAM_TOP + 1.5, X.LEVER.z - X.BEAM_TOP - 1.5, { tone: "mid" }, { bevel: 0.3 });
  put("gate.lever", [pv[0], pv[1], X.LEVER.z + 0.7], liveSolid(X.leverPaths(0, P), { tone: "hi", lit: true, part: "lever" }), [rec(A.extruded(X.leverRing(0), X.LEVER.z, X.LEVER.h, { name: "gate.lever", owner: "gate" }))]);
  cyl("gate.cap", "gate", pv, 1.3, X.LEVER.z + X.LEVER.h, 0.8, { tone: "mid" }, { extra: D([at([pv[0], pv[1], X.LEVER.z + X.LEVER.h + 0.8])], { size: 0.45 }) });
}

// ---------- the stop flag ----------
const FLAG_DROP = 14;
{
  const o = "flag";
  const n = X.LEVER.nose;
  cyl("flag.base", o, n, 4, 0, 1.2, { tone: "lo" }, { bevel: 0.3, extra: D([at([n[0] - 2.8, n[1], 1.2]), at([n[0] + 2.8, n[1], 1.2])], { size: 0.4 }) });
  const SLEEVE_TOP = 18;
  cyl("flag.sleeve", o, n, 2.4, 1.2, SLEEVE_TOP - 1.2, { tone: "mid" }, { extra: L(k.sideArc(n[0], n[1], 2.4, 10, P, 14), { tone: "faint" }) });
  {
    const F = G.frameOf([n[0], n[1], SLEEVE_TOP], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const rod = G.rodOut(F, 0, X.LEVER.z - 1.9 - SLEEVE_TOP, 1, P, { stroke: FLAG_DROP });
    const svg = `<defs><clipPath id="ar-rod"><path data-hold d="${rod.clip}"/></clipPath></defs><g clip-path="url(#ar-rod)">${S(rod.paths, { tone: "hi", crease: "none" })}</g>`;
    put("flag.rod", [n[0], n[1], 35], svg, [rec(A.slide(F, 0, rod.to, 1, { name: "flag.rod", owner: o }))], { part: "flag" });
  }
  cyl("flag.collar", o, n, 2.2, X.LEVER.z - 1.9, 1.9, { tone: "hi" }, { part: "flag" });
  const plate = { x: n[0] + 0.8, y: n[1] - 0.4, w: 22, d: 0.8, r: 0 };
  const fy = n[1] + 0.4 + 0.02;
  const face = (x0, x1, z0, z1) => k.pathOf([[x0, fy, z0], [x1, fy, z0], [x1, fy, z1], [x0, fy, z1]].map(at), true);
  const flagSvg = S(k.slabOf(plate, 33, 14, P, 1), { tone: "hi", crease: "lo", inner: L(face(plate.x + 2.4, plate.x + plate.w - 2, 35, 45), { tone: "lo" }) + L(face(plate.x + 5, plate.x + plate.w - 4.6, 38.6, 41.4), { tone: "mid" }) });
  put("flag.plate", [plate.x + 11, n[1], 40], flagSvg, [rec(A.slab(plate, 33, 14, { name: "flag.plate", owner: o }, 1))], { part: "flag" });
}

// ---------- order, write ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const body = R.items.map((item) => (item.part ? `<g data-part="${item.part}">${item.svg}</g>` : item.svg));
const halos = [k.insetPlan(TT, 2)].map((plan) => `<path class="iso-halo" style="filter:blur(3px)" d="${k.haloOf(plan, 0, 0.1, P)}"/>`).join("");
body.splice(R.items.findIndex((item) => item.name === "stand.plate") + 1, 0, halos);

const LABEL =
  "A player-piano roll reader on a bench. A punched paper roll, the frozen agent run, winds from one spool to the other across a reading table. A comb of five feeler fingers reads each row of holes. When the send_email finger drops without the approval finger beside it, it releases the gate lever and the stop flag drops: the build is blocked.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [...back, ...body] });
writeFileSync(join(SRC, "agentreplay.svg"), svg);

// ---------- the live module ----------
const strip = (src) => src.replace(/^import .*$/gm, "").replace(/^export /gm, "");
const namesOf = (src) => [...src.matchAll(/^export (?:const|function) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
const shapesSrc = readFileSync(join(HERE, "shapes.mjs"), "utf8");
const modelSrc = readFileSync(join(HERE, "model.mjs"), "utf8");
const names = [...namesOf(modelSrc), ...namesOf(shapesSrc)];
const DATA = { P, travel: 1.6, gateTravel: 1.9, drop: FLAG_DROP };
const liveBody = readFileSync(join(HERE, "live.tpl.js"), "utf8")
  .replace("/*__LIB__*/", `const AR = (() => {\n${strip(modelSrc)}\n${strip(shapesSrc)}\nreturn { ${names.join(", ")} };\n})();`)
  .replace("/*__DATA__*/", `const DATA = ${JSON.stringify(DATA)};`);
const IMPORT = `import { extrude, iso, pathOf, translateAlong, axisVector, holdStill } from "../../vendor/anatomy/kit/iso-kit.mjs";\n`;
writeFileSync(join(SRC, "agentreplay.live.js"), IMPORT + liveBody);

const inline = strip(liveBody) + `\nmount(document.querySelector(".iso-stage"), { mode: "tour" });\n`;
for (const theme of ["light", "dark"]) {
  const plate = k.plateHtml({
    fig: "Fig 2",
    title: "Roll reader and gate",
    hint: "Click to replay the bad run",
    readout: M.REST_TEXT,
    keys: [
      { mark: "lit", label: "Gate lever: released when a send_email has no approval" },
      { mark: "raised", label: "The roll: a frozen run, one row of holes per tool call" },
      { mark: "edge", label: "Feeler fingers: one per tool, reading every call" },
    ],
    caption:
      "AgentReplay freezes a production agent run as plain JSON and replays it like a punched roll. Each row is one tool call. The comb reads every row; when send_email comes through without an approval in the same call, the gate lever lets go and the stop flag drops, so the build fails. The fixed run asks first and goes through. On the CRM pilot the gates caught 20 of 20 vulnerable runs and passed 20 of 20 hardened ones, with no judge model.",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Roll reader. Click or press Enter to replay the vulnerable run; press F for the fixed run.">${svg}</div>`,
  });
  writeFileSync(join(HERE, theme === "light" ? "preview-light.html" : "preview.html"), k.pageHtml({ title: "AgentReplay", theme, body: plate, script: kitScript() + inline }));
}
console.log("wrote agentreplay.svg, agentreplay.live.js, previews", `${R.items.length} items`, `${R.solids.length} solids`, `scale ${KS.toFixed(3)}`, `svg ${(svg.length / 1024).toFixed(0)} KB`);

A.auditOrExit(R, P, {});
