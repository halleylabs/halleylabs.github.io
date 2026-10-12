// faultline, the truth behind the figure.
// Numbers from src/data/projects/faultline.json (README pilot): where a rule covered the
// tempting import, agents crossed it 3 of 6 times with no guidance, 5 of 6 with the rule in
// AGENTS.md, and 0 of 6 with faultline.
// The jig: a tray split by fences into six bays (the declared systems). A pick-and-place arm
// carries a part (an import) from bay to bay. Fences you marked as fault lines carry a
// limit-switch flag; a move that would cross one trips the flag and the arm stops short.

export const ATTEMPTS = 6;
export const SHIPPED_WITH = 0;
export const SHIPPED_WITHOUT = 3;
export const SHIPPED_RULE_IN_AGENTS_MD = 5;

// Bays (systems), floor centres in world units.
export const BAYS = {
  BL: [-65, -21.5],
  BM: [0, -21.5],
  BR: [65, -21.5],
  FL: [-65, 21.5],
  FM: [0, 21.5],
  FR: [65, 21.5],
};
export const HOME = "BM";

// Fault lines: a limit switch on a fence, at the point a move between two bays crosses it.
// `travel` is the axis of the move it blocks.
export const SWITCHES = [
  { id: "s1", at: [33, -21.5], travel: "x" },
  { id: "s2", at: [-65, 0], travel: "y" },
  { id: "s3", at: [33, 21.5], travel: "x" },
];
// Plain fences (crossable): y fences at x = -33, 33 and the x fence at y = 0.

// Heights.
export const PAD_TOP = 12.4; // a part set down on a bay's nest
export const CARRY = 20; // part bottom while it travels, above every fence (top 11)
export const PIVOT_Z = 17.3; // flag pivot on the switch body
export const CONTACT_H = 24 - PIVOT_Z; // where the part's side meets the flag, above the pivot

// The head's leading extents (part radius in x, finger outside in y) and the flag's half thickness.
export const LEAD = { x: 5, y: 7.4 };
export const FLAG_HALF = 0.6;
export const PUSH = 1.6; // how far past first touch the arm moves before the switch opens the circuit

// The tour: twelve moves from bay to bay, six of them forbidden.
export const TOUR = [
  ["BM", "BR"],
  ["BM", "BL"],
  ["BL", "FL"],
  ["BL", "BR"],
  ["BL", "BM"],
  ["BM", "FM"],
  ["FM", "FR"],
  ["FM", "FL"],
  ["FL", "FR"],
  ["FL", "FM"],
  ["FM", "BM"],
  ["BM", "FL"],
];
// The one calm motion a site card plays on hover.
export const HOVER_MOVE = ["BM", "BR"];

// A route moves along x first, then along y. It stops at the first fault line it would cross.
export function route(from, to) {
  const [x0, y0] = BAYS[from];
  const [x1, y1] = BAYS[to];
  const legs = [
    { axis: "x", fixed: y0, a: x0, b: x1 },
    { axis: "y", fixed: x1, a: y0, b: y1 },
  ].filter((leg) => leg.a !== leg.b);
  const points = [[x0, y0]];
  for (const leg of legs) {
    const dir = Math.sign(leg.b - leg.a);
    const hit = SWITCHES.filter((s) => {
      if (s.travel !== leg.axis) return false;
      const along = leg.axis === "x" ? s.at[0] : s.at[1];
      const across = leg.axis === "x" ? s.at[1] : s.at[0];
      return Math.abs(across - leg.fixed) < 1e-6 && (along - leg.a) * dir > 0 && (leg.b - along) * dir > 0;
    }).sort((p, q) => Math.abs((leg.axis === "x" ? p.at[0] : p.at[1]) - leg.a) - Math.abs((leg.axis === "x" ? q.at[0] : q.at[1]) - leg.a))[0];
    if (hit) {
      const along = leg.axis === "x" ? hit.at[0] : hit.at[1];
      const touch = along - dir * (FLAG_HALF + LEAD[leg.axis]);
      const point = leg.axis === "x" ? [touch, leg.fixed] : [leg.fixed, touch];
      points.push(point);
      return { from, to, points, stop: { id: hit.id, axis: leg.axis, dir, touch } };
    }
    points.push(leg.axis === "x" ? [leg.b, leg.fixed] : [leg.fixed, leg.b]);
  }
  return { from, to, points, stop: null };
}

// Timing (seconds). Travel uses a smoothstep per leg.
const LIFT = 0.5;
const SET = 0.5;
const DWELL = 0.55;
const HOLD = 0.7;
const travelTime = (distance) => 0.45 + distance / 62;

// A move as a list of segments, each from one pose [x, y, z] to the next.
export function timeline(move) {
  const r = route(move[0], move[1]);
  const segs = [];
  const add = (to, dur, tag) => {
    const from = segs.length ? segs[segs.length - 1].to : [r.points[0][0], r.points[0][1], PAD_TOP];
    segs.push({ from, to, dur, tag });
  };
  const [sx, sy] = r.points[0];
  add([sx, sy, CARRY], LIFT, "lift");
  for (let i = 1; i < r.points.length; i++) {
    const [x, y] = r.points[i];
    const [px, py] = r.points[i - 1];
    add([x, y, CARRY], travelTime(Math.hypot(x - px, y - py)), "travel");
  }
  if (r.stop) {
    const last = r.points[r.points.length - 1];
    const pushed = r.stop.axis === "x" ? [last[0] + r.stop.dir * PUSH, last[1]] : [last[0], last[1] + r.stop.dir * PUSH];
    add([pushed[0], pushed[1], CARRY], 0.32, "trip");
    add([pushed[0], pushed[1], CARRY], HOLD, "hold");
    for (let i = r.points.length - 1; i >= 0; i--) {
      const [x, y] = r.points[i];
      const prev = segs[segs.length - 1].to;
      add([x, y, CARRY], i === r.points.length - 1 ? 0.35 : travelTime(Math.hypot(x - prev[0], y - prev[1])), "back");
    }
    add([sx, sy, PAD_TOP], SET, "set");
  } else {
    const [ex, ey] = r.points[r.points.length - 1];
    add([ex, ey, PAD_TOP], SET, "set");
  }
  add(segs[segs.length - 1].to, DWELL, "dwell");
  const total = segs.reduce((sum, seg) => sum + seg.dur, 0);
  return { route: r, segs, total, ends: r.stop ? move[0] : move[1] };
}

const smooth = (t) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};

// The head's pose at time t into a move: [x, y, z] and the segment tag.
export function poseAt(line, t) {
  let at = 0;
  for (const seg of line.segs) {
    if (t <= at + seg.dur) {
      const k = smooth((t - at) / seg.dur);
      return { pose: seg.from.map((v, i) => v + (seg.to[i] - v) * k), tag: seg.tag };
    }
    at += seg.dur;
  }
  const last = line.segs[line.segs.length - 1];
  return { pose: last.to.slice(), tag: "rest" };
}

// How far the head's leading face has pushed past a flag's rest face, and the flag angle that
// follows from it (the flag pivots, the part's side touches it CONTACT_H above the pivot).
export function pushOn(sw, pose) {
  const across = sw.travel === "x" ? Math.abs(pose[1] - sw.at[1]) : Math.abs(pose[0] - sw.at[0]);
  if (across > 4 || pose[2] < CARRY - 4) return 0;
  const along = sw.travel === "x" ? pose[0] - sw.at[0] : pose[1] - sw.at[1];
  const reach = FLAG_HALF + LEAD[sw.travel];
  const pressed = reach - Math.abs(along);
  if (pressed <= 0) return 0;
  return -Math.sign(along) * Math.asin(Math.min(0.5, pressed / CONTACT_H));
}

// Readout words, from the same model as the motion.
export function readoutOf(index, phase) {
  if (index < 0) return `${SHIPPED_WITH} of ${ATTEMPTS} forbidden shipped`;
  const move = TOUR[index];
  const forbidden = route(move[0], move[1]).stop;
  if (!forbidden) return phase === "set" || phase === "dwell" ? "allowed · placed" : "allowed · moving";
  const nth = TOUR.slice(0, index + 1).filter((m) => route(m[0], m[1]).stop).length;
  if (phase === "lift" || phase === "travel") return `forbidden ${nth} of ${ATTEMPTS} · moving`;
  return `forbidden ${nth} of ${ATTEMPTS} · stopped`;
}
