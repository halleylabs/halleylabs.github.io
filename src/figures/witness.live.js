import { cylinder, extrude, lineOnTop, ring, iso, pathOf, translateAlong } from "../../vendor/anatomy/kit/iso-kit.mjs";
const WT = (() => {
// witness: layout and the parts that change shape as the deck runs.
// Shared by build.mjs (static art) and the live module (inlined, imports stripped).


const DECK_TOP = 19.2;
const SUPPLY = [-29, -14];
const TAKEUP = [29, -14];
const REEL = { table: 8, flange: 23, flangeZ: 20.2, packZ: 21.2, packTop: 26.6, cap: 5, capTop: 28.6, hub: 7.5, holes: 21.6 };
const TAPE_Z = 21.6;
const TAPE_H = 4.6;
const TAPE_T = 0.5;
const GUIDE_L = [-17, 18.6];
const GUIDE_R = [16, 18.6];
const ROLLER = 1.6;
const FRONT_Y = GUIDE_L[1] + ROLLER; // tape's inner face on the front run
const METER = { c: [111, 0], top: 16, r: 8.4, from: -50, span: 100 };

const rad = (deg) => (deg * Math.PI) / 180;

// External tangent between two circles; side picks the one whose normal points along +side on x.
function tangent(c1, r1, c2, r2, side) {
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const D = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const a = Math.acos((r1 - r2) / D);
  const options = [base + a, base - a].map((angle) => [Math.cos(angle), Math.sin(angle)]);
  const n = options.find((v) => Math.sign(v[0]) === side) ?? options[0];
  return { n, a1: Math.atan2(n[1], n[0]), p1: [c1[0] + r1 * n[0], c1[1] + r1 * n[1]], p2: [c2[0] + r2 * n[0], c2[1] + r2 * n[1]] };
}

function arc(c, r, a0, a1, steps = 10) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  });
}

// A ribbon of tape standing on its edge: a centreline offset by half the tape's thickness either side.
function ribbon(line) {
  const n = line.length;
  const normals = line.map((p, i) => {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
  const h = TAPE_T / 2;
  const plus = line.map((p, i) => [p[0] + normals[i][0] * h, p[1] + normals[i][1] * h]);
  const minus = line.map((p, i) => [p[0] - normals[i][0] * h, p[1] - normals[i][1] * h]);
  return [...plus, ...minus.reverse()];
}

// The tape from the supply pack, round the front of guide L, across the heads, round guide R, onto the take-up pack.
// Every part of it faces the viewer, so it is one ribbon.
function tapeRing(rs, rt) {
  const g = ROLLER + TAPE_T / 2;
  const left = tangent(SUPPLY, rs + TAPE_T / 2, GUIDE_L, g, -1);
  const right = tangent(TAKEUP, rt + TAPE_T / 2, GUIDE_R, g, 1);
  return ribbon([left.p1, ...arc(GUIDE_L, g, left.a1, Math.PI / 2, 8), ...arc(GUIDE_R, g, Math.PI / 2, right.a1, 8), right.p1]);
}

const tapePaths = (rs, rt, P) => extrude(tapeRing(rs, rt), TAPE_Z, TAPE_H, P, { convex: false });

const packPaths = (c, r, P) => cylinder(c[0], c[1], r, REEL.packZ, REEL.packTop - REEL.packZ, P, 60);

// Marks that turn with a reel: three hub spokes, a splice line on the pack, six holes in the flange.
function reelMarks(c, packR, angle, P) {
  const at = (a, r) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  const spokes = [0, 1, 2].map((i) => lineOnTop(at(angle + (i * 2 * Math.PI) / 3, 1.3), at(angle + (i * 2 * Math.PI) / 3, REEL.cap), REEL.capTop, P)).join("");
  const splice = lineOnTop(at(angle + 0.9, REEL.hub), at(angle + 0.9, packR), REEL.packTop, P);
  const holes = Array.from({ length: 6 }, (_, i) => iso([...at(angle + (i * Math.PI) / 3 + 0.5, REEL.holes), REEL.flangeZ + 1], P));
  return { spokes, splice, holes };
}

const holesSvg = (points) => points.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="0.55"/>`).join("");

function needlePath(v, P) {
  const a = rad(METER.from + METER.span * v);
  const [cx, cy] = METER.c;
  const s = Math.sin(a);
  const c = Math.cos(a);
  return lineOnTop([cx - s * 2.6, cy + c * 2.6], [cx + s * METER.r, cy - c * METER.r], METER.top + 0.2, P);
}

const hubRing = (c, P) => ring(c[0], c[1], REEL.hub, REEL.packTop, P, 48);
const flat = (points) => pathOf(points);

// witness: the truth that drives the figure.
// Numbers from src/data/projects/witness.json (README demo and bench).
const NUMBERS = {
  missMs: 803, // a call that reaches the model API: 803 ms
  hitUs: 541, // the same call served from the record: 541 µs
  addedMs: 0.25, // median added per call to record everything
  perSec: 53000, // recorded calls per second on one machine
};

// The tape: a reel pack is a spiral, so its radius grows with the square root of the length wound.
const TAPE = { hub: 7.5, full: 20, c: 0.09, rest: 600, perCall: 75 };
const packOf = (L) => ({
  supply: Math.sqrt(TAPE.full * TAPE.full - TAPE.c * L),
  takeup: Math.sqrt(TAPE.hub * TAPE.hub + TAPE.c * L),
});
// Angle each reel has turned for L units of tape moved: dθ = dL / r, integrated in closed form.
const turnsOf = (L) => {
  const p = packOf(L);
  return { supply: (2 / TAPE.c) * (TAPE.full - p.supply), takeup: (2 / TAPE.c) * (p.takeup - TAPE.hub) };
};

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const ramp = (t, a, b) => ease((t - a) / (b - a));
// up from a to b, held, down from c to d
const bump = (t, a, b, c, d) => Math.min(ramp(t, a, b), 1 - ramp(t, c, d));

const MISS_UP = 0.3;
const MISS_DOWN = MISS_UP + NUMBERS.missMs / 1000; // the needle holds for the true 803 ms

const KINDS = {
  // A new call: the line runs to the model, the model is paid, the answer is recorded to tape.
  miss: { dur: 2.1, dL: TAPE.perCall },
  // A repeat call: cued from the tape, the line to the model stays idle.
  hit: { dur: 1.0, dL: TAPE.perCall },
  seek: { dur: 1.3 },
  crash: { dur: 1.0, dL: 0 },
  done: { dur: 1.6, dL: 0 },
  pause: { dur: 0.6, dL: 0 },
};

const seg = (kind, extra = {}) => ({ kind, dur: KINDS[kind].dur, dL: KINDS[kind].dL ?? 0, ...extra });

// The idle tour: a run makes three new calls (each paid and recorded), crashes,
// and resumes by replaying the same three calls from tape with zero model calls.
const TOUR = [
  seg("pause", { dur: 0.6 }),
  seg("miss", { n: 1 }),
  seg("miss", { n: 2 }),
  seg("miss", { n: 3 }),
  seg("crash"),
  seg("seek", { dL: -3 * TAPE.perCall, say: "resuming from the record" }),
  seg("pause", { dur: 0.4, say: "resuming from the record" }),
  seg("hit", { n: 1 }),
  seg("hit", { n: 2 }),
  seg("hit", { n: 3 }),
  seg("done"),
  seg("seek", { dL: -3 * TAPE.perCall, say: "rewinding" }),
];

// One calm motion for the site cards: one new call, then the same call again from tape.
const HOVER = [seg("miss", { n: 1 }), seg("seek", { dL: -TAPE.perCall, dur: 0.9, say: "cueing the record" }), seg("hit", { n: 1 })];

const durationOf = (list) => list.reduce((sum, s) => sum + s.dur, 0);

const REST_TEXT = "803 ms paid once · 541 µs after";

// The pose at time t into a list of segments that starts with L0 of tape wound.
function poseAt(list, t, L0 = TAPE.rest) {
  let L = L0;
  let start = 0;
  for (const s of list) {
    if (t < start + s.dur) return poseIn(s, t - start, L);
    L += s.dL;
    start += s.dur;
  }
  return { L, button: 0, rec: 0, play: 0, rew: 0, stop: 0, pinch: 0, needle: 0, text: null, done: true };
}

function poseIn(s, u, L) {
  const p = { L, button: 0, rec: 0, play: 0, rew: 0, stop: 0, pinch: 0, needle: 0, text: s.say ?? null, done: false };
  if (s.kind === "miss") {
    p.button = bump(u, 0, 0.12, 0.3, 0.45);
    p.rec = bump(u, 0.12, 0.3, 1.75, 1.95);
    p.pinch = bump(u, 0.2, 0.36, 1.75, 1.95);
    p.needle = bump(u, MISS_UP, MISS_UP + 0.12, MISS_DOWN - 0.06, MISS_DOWN + 0.12);
    p.L = L + s.dL * ramp(u, 0.36, 1.75);
    p.text = u < MISS_UP ? "new call · out to the model" : u < MISS_DOWN ? "model paid · 803 ms" : "recorded · 0.25 ms added";
  } else if (s.kind === "hit") {
    p.button = bump(u, 0, 0.12, 0.3, 0.45);
    p.play = bump(u, 0.1, 0.24, 0.72, 0.9);
    p.pinch = bump(u, 0.16, 0.28, 0.72, 0.9);
    p.L = L + s.dL * ramp(u, 0.26, 0.74);
    p.text = "repeat · from tape · 541 µs";
  } else if (s.kind === "seek") {
    p.rew = bump(u, 0, 0.16, s.dur - 0.25, s.dur - 0.05);
    p.L = L + s.dL * ramp(u, 0.12, s.dur - 0.12);
  } else if (s.kind === "crash") {
    p.stop = bump(u, 0, 0.12, 0.35, 0.55);
    p.text = "run crashed";
  } else if (s.kind === "done") {
    p.stop = bump(u, 0, 0.12, 0.35, 0.55);
    p.text = "replayed · model idle";
  }
  return p;
}

return { DECK_TOP, SUPPLY, TAKEUP, REEL, TAPE_Z, TAPE_H, TAPE_T, GUIDE_L, GUIDE_R, ROLLER, FRONT_Y, METER, tapeRing, tapePaths, packPaths, reelMarks, holesSvg, needlePath, hubRing, flat, NUMBERS, TAPE, packOf, turnsOf, KINDS, seg, TOUR, HOVER, durationOf, REST_TEXT, poseAt };
})();
const DATA = {"P":{"origin":[240,148.83828241919898],"scale":1.1987302940209248,"azimuth":55,"elevation":30},"pinch":2.5,"key":1.4,"button":2};

// witness live: writes attributes on the existing svg; one loop, only while visible.
export function mount(root, { mode = "tour" } = {}) {
  const { P } = DATA;
  const { TAPE, packOf, turnsOf, poseAt, durationOf, seg, TOUR, HOVER, REST_TEXT } = WT;
  const qa = (sel) => [...root.querySelectorAll(sel)];
  const q = (sel) => root.querySelector(sel);
  const el = {
    button: qa('[data-part="button"]'),
    pinch: qa('[data-part="pinch"]'),
    keys: Object.fromEntries(["rew", "stop", "play", "rec"].map((name) => [name, qa(`[data-part="key-${name}"]`)])),
    pack: { supply: q('[data-part="pack-supply"]'), takeup: q('[data-part="pack-takeup"]') },
    spokes: { supply: q('[data-part="spokes-supply"]'), takeup: q('[data-part="spokes-takeup"]') },
    splice: { supply: q('[data-part="splice-supply"]'), takeup: q('[data-part="splice-takeup"]') },
    holes: { supply: qa('[data-part="holes-supply"] circle'), takeup: qa('[data-part="holes-takeup"] circle') },
    tape: q('[data-part="tape"]'),
    needle: q('[data-part="needle"]'),
  };
  const plate = root.closest(".iso-plate");
  const readout = root.querySelector("[data-readout]") || (plate && plate.querySelector("[data-readout]"));
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const centre = { supply: WT.SUPPLY, takeup: WT.TAKEUP };

  const REST = { L: TAPE.rest, button: 0, rec: 0, play: 0, rew: 0, stop: 0, pinch: 0, needle: 0, text: null, done: true };
  const shown = { ...REST };
  let target = { ...REST };
  let list = null;
  let looping = false;
  let t = 0;
  let L0 = TAPE.rest;
  let after = null;
  let frame = 0;
  let last = 0;
  let visible = false;
  let resume = 0;
  let lastText = "";
  const touring = () => mode === "tour" && !still.matches;

  function play(next, { loop = false, then = null } = {}) {
    list = next;
    looping = loop;
    after = then;
    t = 0;
    L0 = shown.L;
    run();
  }
  const back = (to = TAPE.rest) => (Math.abs(shown.L - to) > 0.5 ? [seg("seek", { dL: to - shown.L, dur: 0.7 })] : []);
  const startTour = () => play(back(), { then: () => play(TOUR, { loop: true }) });

  function setSolid(g, paths) {
    if (!g) return;
    const c = g.children;
    c[0].setAttribute("d", paths.fill);
    for (let i = 0; i < 4; i++) c[1 + i].setAttribute("d", paths.shades[i] || "");
    c[5].setAttribute("d", paths.top);
    c[6].setAttribute("d", paths.crease);
    c[7].setAttribute("d", paths.outline);
  }
  const move = (nodes, by) => {
    const value = translateAlong(P, by);
    nodes.forEach((node) => node.setAttribute("transform", value));
  };

  let drawnL = NaN;
  function draw() {
    move(el.button, [0, 0, -DATA.button * shown.button]);
    move(el.pinch, [0, DATA.pinch * (1 - shown.pinch), 0]);
    for (const name of ["rew", "stop", "play", "rec"]) move(el.keys[name], [0, 0, -DATA.key * shown[name]]);
    if (el.needle) el.needle.setAttribute("d", WT.needlePath(shown.needle, P));
    if (shown.L !== drawnL) {
      drawnL = shown.L;
      const r = packOf(shown.L);
      const turn = turnsOf(shown.L);
      for (const key of ["supply", "takeup"]) {
        setSolid(el.pack[key], WT.packPaths(centre[key], r[key], P));
        const marks = WT.reelMarks(centre[key], r[key], -turn[key], P);
        el.spokes[key] && el.spokes[key].setAttribute("d", marks.spokes);
        el.splice[key] && el.splice[key].setAttribute("d", marks.splice);
        el.holes[key].forEach((node, i) => {
          node.setAttribute("cx", marks.holes[i][0].toFixed(1));
          node.setAttribute("cy", marks.holes[i][1].toFixed(1));
        });
      }
      setSolid(el.tape, WT.tapePaths(r.supply, r.takeup, P));
    }
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
      const local = looping ? t % span : t;
      target = poseAt(list, local, L0);
      if (!looping && t >= span) {
        list = null;
        target = { ...REST, L: target.L };
        if (after) {
          const next = after;
          after = null;
          next();
        }
      }
    }
    let moving = false;
    moving = follow("L", 0.06, dt) || moving;
    for (const key of ["button", "rec", "play", "rew", "stop", "pinch", "needle"]) moving = follow(key, 0.07, dt) || moving;
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

  // Interaction
  const holdTour = () => {
    clearTimeout(resume);
    if (mode === "tour") resume = setTimeout(() => touring() && startTour(), 3600 + 2400);
  };
  const again = () => {
    if (still.matches) return;
    holdTour();
    play([...back(), seg("hit", { n: 1 })]);
  };
  const fresh = () => {
    if (still.matches) return;
    holdTour();
    play([...(shown.L > TAPE.rest + 3 * TAPE.perCall ? back() : []), seg("miss", { n: 1 })]);
  };
  const enter = () => play(HOVER);
  const leave = () => play(back());
  const down = (event) => {
    if (event.button !== 0) return;
    again();
  };
  const key = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      again();
    } else if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      fresh();
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
