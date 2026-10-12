import { extrude, iso, pathOf, translateAlong, axisVector, holdStill } from "../../vendor/anatomy/kit/iso-kit.mjs";
const AR = (() => {
// AgentReplay: the truth that drives the figure.
// Numbers from src/data/projects/agentreplay.json (CRM adversarial pilot).
const NUMBERS = { caught: 20, vulnerable: 20, passed: 20, hardened: 20 };

// The roll is a frozen run: one row per recorded tool call, one lane per tool.
const LANES = ["read_crm", "search", "update_record", "approval", "send_email"];
const LANE_Y = [-24, -14, -4, 6, 16];
const APPROVAL = 3;
const GATE = 4; // the gate finger: send_email must come with an approval in the same call

const PITCH = 12; // roll units between rows
const FIRST = -24; // x of row 0 when the roll is at s = 0; the comb reads at x = 0
// The bad run sends an email with no approval on call 5. The fixed run asks first.
const BAD = [[0], [1], [0, 2], [1], [GATE], [2]];
const FIXED_AT = 7; // row where the fixed run starts on the same roll
const FIXED = [[0], [1], [0, 2], [1], [APPROVAL, GATE], [2]];
const ROWS = [...BAD.map((lanes, i) => ({ row: i, lanes, run: "bad", call: i + 1 })), ...FIXED.map((lanes, i) => ({ row: FIXED_AT + i, lanes, run: "fixed", call: i + 1 }))];
const LAST_ROW = FIXED_AT + FIXED.length - 1;

const xOfRow = (row, s) => FIRST - row * PITCH + s;
const sAtRow = (row) => row * PITCH - FIRST; // s when that row is under the comb

const HOLE = { half: 2.6, wide: 1.8 }; // a hole is 5.2 along the roll and 3.6 across
const TIP = 1;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// How far each finger has dropped (0..1) with the roll at s.
function fingersAt(s) {
  const out = LANE_Y.map(() => 0);
  for (const { row, lanes } of ROWS) {
    const x = Math.abs(xOfRow(row, s));
    if (x > HOLE.half + 1) continue;
    const d = smooth((HOLE.half - TIP - x) / 0.5 + 1);
    for (const lane of lanes) out[lane] = Math.max(out[lane], d);
  }
  return out;
}
// The gate trips when the send finger drops and the approval finger does not drop with it.
const tripsAt = (s) => {
  const f = fingersAt(s);
  return f[GATE] > 0.98 && f[APPROVAL] < 0.5;
};

const SPEED = 18;
const TRIP_S = sAtRow(BAD.findIndex((lanes) => lanes.includes(GATE) && !lanes.includes(APPROVAL)));
const END_S = sAtRow(LAST_ROW) + 14;

const ease = (x) => smooth(x);
const ramp = (t, a, b) => ease((t - a) / (b - a));

// Segments: the roll moves only in run and rewind; trip and reset move the lever and the flag.
const TOUR = [
  { kind: "hold", dur: 0.8, s: 0, gate: 0 },
  { kind: "run", s0: 0, s1: TRIP_S, run: "bad", dur: TRIP_S / SPEED },
  { kind: "trip", dur: 2.4, s: TRIP_S },
  { kind: "reset", dur: 0.9, s: TRIP_S },
  { kind: "run", s0: TRIP_S, s1: END_S, run: "fixed", dur: (END_S - TRIP_S) / SPEED },
  { kind: "hold", dur: 1.8, s: END_S, gate: 0, say: "fixed run · every gate holds" },
  { kind: "rewind", s0: END_S, s1: 0, dur: 1.6 },
];
// One calm motion for the site cards: the bad run is read until the gate trips, and stays tripped.
const HOVER = [
  { kind: "run", s0: 0, s1: TRIP_S, run: "bad", dur: TRIP_S / SPEED },
  { kind: "trip", dur: 0.9, s: TRIP_S },
];
const SETTLE = (s, gate) => [
  ...(gate > 0.01 ? [{ kind: "reset", dur: 0.7, s }] : []),
  ...(s > 0.5 ? [{ kind: "rewind", s0: s, s1: 0, dur: Math.min(1.4, 0.4 + s / 120) }] : []),
];

const durationOf = (list) => list.reduce((sum, seg) => sum + seg.dur, 0);
const REST_TEXT = `${NUMBERS.caught} of ${NUMBERS.vulnerable} caught · ${NUMBERS.passed} of ${NUMBERS.hardened} passed`;

function callAt(s) {
  let best = null;
  for (const r of ROWS) if (xOfRow(r.row, s) >= -HOLE.half) best = !best || r.row > best.row ? r : best;
  return best;
}

// The pose at time t into a segment list: roll position s, gate 0..1 (lever swing), flag 0..1 (drop).
function poseAt(list, t) {
  let start = 0;
  for (const seg of list) {
    if (t < start + seg.dur) return poseIn(seg, t - start);
    start += seg.dur;
  }
  const lastSeg = list[list.length - 1];
  return { ...poseIn(lastSeg, lastSeg.dur), done: true };
}

function poseIn(seg, u) {
  const p = { s: 0, gate: 0, flag: 0, text: seg.say ?? null, done: false };
  if (seg.kind === "run") {
    p.s = seg.s0 + (seg.s1 - seg.s0) * (seg.run === "bad" ? Math.min(1, u / seg.dur) : ramp(u, 0, seg.dur));
    const call = callAt(p.s);
    const label = seg.run === "bad" ? "vulnerable run" : "fixed run";
    p.text = call && call.run === seg.run ? `${label} · call ${call.call} of ${BAD.length}` : `${label} · replaying`;
  } else if (seg.kind === "trip") {
    p.s = seg.s;
    p.gate = ramp(u, 0, 0.22);
    p.flag = Math.min(1, Math.max(0, (u - 0.12) / 0.32)) ** 2;
    p.text = "send_email without approval · blocked";
  } else if (seg.kind === "reset") {
    p.s = seg.s;
    p.flag = 1 - ramp(u, 0, seg.dur * 0.6);
    p.gate = 1 - ramp(u, seg.dur * 0.5, seg.dur);
    p.text = "gate reset";
  } else if (seg.kind === "rewind") {
    p.s = seg.s0 + (seg.s1 - seg.s0) * ramp(u, 0, seg.dur);
    p.text = REST_TEXT;
  } else {
    p.s = seg.s;
    p.gate = seg.gate ?? 0;
  }
  return p;
}

// AgentReplay: layout and the parts that change as the roll is read.
// Shared by build.mjs (static art) and the live module (inlined, imports stripped).



const AXLE_Z = 17.8;
const PACK_R = 9.8;
const FLANGE_R = 13;
const SPOOL_X = { supply: -64, takeup: 64 };
const PAPER = { y0: -32, y1: 24, z: 27.6, top: 28 };
const FRONT_FLANGE = 25.4; // the outer face of each spool's front flange
const CLIP_X = [-64, 64];
const BEAM_TOP = 45;

// The gate lever: it swings about a vertical pin; its tail is held by the gate finger's head
// and its nose holds the stop flag's collar up.
const LEVER = { pivot: [7.42, 26.25], tail: [3.82, 14.8], nose: [11.02, 37.7], r: 1.6, z: 50.4, h: 1.4, swing: -35 };

const rot = ([x, y], [cx, cy], a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
};

function leverRing(gate) {
  const a = (LEVER.swing * Math.PI * gate) / 180;
  const t = rot(LEVER.tail, LEVER.pivot, a);
  const n = rot(LEVER.nose, LEVER.pivot, a);
  const dir = Math.atan2(n[1] - t[1], n[0] - t[0]);
  const cap = (c, from) => Array.from({ length: 13 }, (_, i) => {
    const ang = from + (i / 12) * Math.PI;
    return [c[0] + LEVER.r * Math.cos(ang), c[1] + LEVER.r * Math.sin(ang)];
  });
  return [...cap(n, dir - Math.PI / 2), ...cap(t, dir + Math.PI / 2)];
}
const leverPaths = (gate, P) => extrude(leverRing(gate), LEVER.z, LEVER.h, P, { bevel: 0.3 });

// Holes punched in the roll, and the small timing marks along its back edge, with the roll at s.
function holesPath(s, P) {
  const parts = [];
  const z = PAPER.top;
  const rect = (x, y, hx, hy) => pathOf([[x - hx, y - hy], [x + hx, y - hy], [x + hx, y + hy], [x - hx, y + hy]].map(([a, b]) => iso([a, b, z], P)), true);
  for (const { row, lanes } of ROWS) {
    const x = xOfRow(row, s);
    if (x < CLIP_X[0] - 3 || x > CLIP_X[1] + 3) continue;
    for (const lane of lanes) parts.push(rect(x, LANE_Y[lane], HOLE.half, HOLE.wide));
  }
  const first = Math.ceil((s - CLIP_X[1] - 3 + FIRST) / PITCH);
  for (let row = first; row <= first + 20; row++) {
    const x = FIRST - row * PITCH + s + PITCH / 2;
    if (x < CLIP_X[0] - 2 || x > CLIP_X[1] + 2) continue;
    parts.push(rect(x, PAPER.y0 + 2.6, 0.6, 0.6));
  }
  return parts.join("");
}

// Three spokes and three windows on a spool's front flange, turned by the roll.
function spoolMarks(key, s, P) {
  const cx = SPOOL_X[key];
  const a0 = -s / PACK_R + (key === "takeup" ? 0.7 : 0);
  const at = (r, a) => iso([cx + r * Math.cos(a), FRONT_FLANGE, AXLE_Z + r * Math.sin(a)], P);
  const spokes = [0, 1, 2].map((i) => pathOf([at(2.6, a0 + (i * 2 * Math.PI) / 3), at(FLANGE_R - 1.4, a0 + (i * 2 * Math.PI) / 3)])).join("");
  const windows = [0, 1, 2].map((i) => {
    const a = a0 + Math.PI / 3 + (i * 2 * Math.PI) / 3;
    const c = [cx + 7.4 * Math.cos(a), AXLE_Z + 7.4 * Math.sin(a)];
    return pathOf(Array.from({ length: 16 }, (_, k) => iso([c[0] + 2 * Math.cos((k / 16) * 2 * Math.PI), FRONT_FLANGE, c[1] + 2 * Math.sin((k / 16) * 2 * Math.PI)], P)), true);
  }).join("");
  return { spokes, windows };
}

return { NUMBERS, LANES, LANE_Y, APPROVAL, GATE, PITCH, FIRST, BAD, FIXED_AT, FIXED, ROWS, LAST_ROW, xOfRow, sAtRow, HOLE, TIP, fingersAt, tripsAt, TOUR, HOVER, SETTLE, durationOf, REST_TEXT, poseAt, AXLE_Z, PACK_R, FLANGE_R, SPOOL_X, PAPER, FRONT_FLANGE, CLIP_X, BEAM_TOP, LEVER, leverRing, leverPaths, holesPath, spoolMarks };
})();
const DATA = {"P":{"origin":[238.03688743213488,148.8046239139685],"scale":1.3528944497024802,"azimuth":55,"elevation":30},"travel":1.6,"gateTravel":1.9,"drop":14};

// AgentReplay live: writes attributes on the existing svg; one loop, only while visible.
export function mount(root, { mode = "tour" } = {}) {
  const { P } = DATA;
  const { poseAt, durationOf, fingersAt, TOUR, HOVER, SETTLE, REST_TEXT, GATE, LANE_Y } = AR;
  const qa = (sel) => [...root.querySelectorAll(sel)];
  const q = (sel) => root.querySelector(sel);
  const el = {
    pins: LANE_Y.map((_, i) => qa(`[data-part="pin${i}"]`)),
    head: qa(`[data-part="head${GATE}"]`),
    flag: qa('[data-part="flag"]'),
    lever: q('[data-part="lever"]'),
    holes: q('[data-part="holes"]'),
    spokes: { supply: q('[data-part="spokes-supply"]'), takeup: q('[data-part="spokes-takeup"]') },
    windows: { supply: q('[data-part="windows-supply"]'), takeup: q('[data-part="windows-takeup"]') },
  };
  const plate = root.closest(".iso-plate");
  const readout = root.querySelector("[data-readout]") || (plate && plate.querySelector("[data-readout]"));
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const REST = { s: 0, gate: 0, flag: 0, text: null };
  const shown = { ...REST };
  let target = { ...REST };
  let list = null;
  let looping = false;
  let t = 0;
  let after = null;
  let frame = 0;
  let last = 0;
  let visible = false;
  let resume = 0;
  let lastText = "";
  let drawnS = NaN;
  let drawnGate = NaN;
  const touring = () => mode === "tour" && !still.matches;

  function play(next, { loop = false, then = null } = {}) {
    list = next;
    looping = loop;
    after = then;
    t = 0;
    run();
  }
  const home = () => SETTLE(shown.s, Math.max(shown.gate, shown.flag));
  const startTour = () => play(home(), { then: () => play(TOUR, { loop: true }) });

  function setSolid(g, paths) {
    if (!g) return;
    for (const node of g.children) {
      const cls = node.getAttribute("class");
      if (cls === "iso-fill") node.setAttribute("d", paths.fill);
      else if (cls === "iso-shade") node.setAttribute("d", paths.shades[+node.getAttribute("data-shade")] || "");
      else if (cls === "iso-top") node.setAttribute("d", paths.top);
      else if (cls.includes("iso-crease")) node.setAttribute("d", paths.crease);
      else if (cls.includes("iso-bevel")) node.setAttribute("d", paths.bevel || "");
      else if (cls.includes("iso-edge")) node.setAttribute("d", paths.outline);
    }
  }
  const move = (nodes, by) => {
    const value = translateAlong(P, by);
    nodes.forEach((node) => node.setAttribute("transform", value));
  };

  function draw() {
    if (shown.s !== drawnS) {
      drawnS = shown.s;
      const f = fingersAt(shown.s);
      el.pins.forEach((nodes, i) => move(nodes, [0, 0, -(i === GATE ? DATA.gateTravel : DATA.travel) * f[i]]));
      move(el.head, [0, 0, -DATA.gateTravel * f[GATE]]);
      const hd = axisVector(P, [0, 0, -DATA.gateTravel * f[GATE]]);
      el.head.forEach((node) => holdStill(node, hd));
      el.holes && el.holes.setAttribute("d", AR.holesPath(shown.s, P));
      for (const key of ["supply", "takeup"]) {
        const marks = AR.spoolMarks(key, shown.s, P);
        el.spokes[key] && el.spokes[key].setAttribute("d", marks.spokes);
        el.windows[key] && el.windows[key].setAttribute("d", marks.windows);
      }
    }
    if (shown.gate !== drawnGate) {
      drawnGate = shown.gate;
      setSolid(el.lever, AR.leverPaths(shown.gate, P));
    }
    move(el.flag, [0, 0, -DATA.drop * shown.flag]);
    const fd = axisVector(P, [0, 0, -DATA.drop * shown.flag]);
    el.flag.forEach((node) => holdStill(node, fd));
    const text = target.text || REST_TEXT;
    if (readout && text !== lastText) readout.textContent = lastText = text;
  }

  const follow = (key, tau, dt) => {
    const goal = target[key];
    shown[key] += (goal - shown[key]) * (1 - Math.exp(-dt / tau));
    if (Math.abs(goal - shown[key]) < 1e-3) shown[key] = goal;
    return shown[key] !== goal;
  };

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (list) {
      t += dt;
      const span = durationOf(list);
      if (list.length) target = poseAt(list, looping ? t % span : t);
      if (!looping && t >= span) {
        list = null;
        if (after) {
          const next = after;
          after = null;
          next();
        }
      }
    }
    let moving = false;
    moving = follow("s", 0.04, dt) || moving;
    moving = follow("gate", 0.04, dt) || moving;
    moving = follow("flag", 0.03, dt) || moving;
    draw();
    frame = visible && (list || moving) ? requestAnimationFrame(tick) : 0;
  }
  function run() {
    if (!frame && visible && !still.matches) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  }, { rootMargin: "120px 0px" });
  io.observe(root);

  const holdTour = () => {
    clearTimeout(resume);
    if (mode === "tour") resume = setTimeout(() => touring() && startTour(), 6000);
  };
  const replay = (which) => {
    if (still.matches) return;
    holdTour();
    const runs = AR.TOUR.filter((seg) => seg.kind === "run");
    const bad = [runs[0], AR.TOUR.find((seg) => seg.kind === "trip")];
    const fixed = [{ kind: "rewind", s0: shown.s, s1: runs[1].s0, dur: 0.6 }, { ...runs[1] }];
    play(which === "bad" ? [...home(), ...bad] : [...(shown.gate > 0.01 || shown.flag > 0.01 ? [{ kind: "reset", dur: 0.6, s: shown.s }] : []), ...fixed]);
  };
  const enter = () => play(HOVER);
  const leave = () => play(home());
  const down = (event) => {
    if (event.button !== 0) return;
    replay("bad");
  };
  const key = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      replay("bad");
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      replay("fixed");
    }
  };
  if (mode === "hover") {
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
  } else {
    root.addEventListener("pointerdown", down);
    root.addEventListener("keydown", key);
    if (touring()) startTour();
  }
  draw();

  return {
    destroy() {
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resume);
      io.disconnect();
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("keydown", key);
    },
  };
}
