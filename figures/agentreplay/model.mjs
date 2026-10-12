// AgentReplay: the truth that drives the figure.
// Numbers from src/data/projects/agentreplay.json (CRM adversarial pilot).
export const NUMBERS = { caught: 20, vulnerable: 20, passed: 20, hardened: 20 };

// The roll is a frozen run: one row per recorded tool call, one lane per tool.
export const LANES = ["read_crm", "search", "update_record", "approval", "send_email"];
export const LANE_Y = [-24, -14, -4, 6, 16];
export const APPROVAL = 3;
export const GATE = 4; // the gate finger: send_email must come with an approval in the same call

export const PITCH = 12; // roll units between rows
export const FIRST = -24; // x of row 0 when the roll is at s = 0; the comb reads at x = 0
// The bad run sends an email with no approval on call 5. The fixed run asks first.
export const BAD = [[0], [1], [0, 2], [1], [GATE], [2]];
export const FIXED_AT = 7; // row where the fixed run starts on the same roll
export const FIXED = [[0], [1], [0, 2], [1], [APPROVAL, GATE], [2]];
export const ROWS = [...BAD.map((lanes, i) => ({ row: i, lanes, run: "bad", call: i + 1 })), ...FIXED.map((lanes, i) => ({ row: FIXED_AT + i, lanes, run: "fixed", call: i + 1 }))];
export const LAST_ROW = FIXED_AT + FIXED.length - 1;

export const xOfRow = (row, s) => FIRST - row * PITCH + s;
export const sAtRow = (row) => row * PITCH - FIRST; // s when that row is under the comb

export const HOLE = { half: 2.6, wide: 1.8 }; // a hole is 5.2 along the roll and 3.6 across
export const TIP = 1;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// How far each finger has dropped (0..1) with the roll at s.
export function fingersAt(s) {
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
export const tripsAt = (s) => {
  const f = fingersAt(s);
  return f[GATE] > 0.98 && f[APPROVAL] < 0.5;
};

const SPEED = 18;
const TRIP_S = sAtRow(BAD.findIndex((lanes) => lanes.includes(GATE) && !lanes.includes(APPROVAL)));
const END_S = sAtRow(LAST_ROW) + 14;

const ease = (x) => smooth(x);
const ramp = (t, a, b) => ease((t - a) / (b - a));

// Segments: the roll moves only in run and rewind; trip and reset move the lever and the flag.
export const TOUR = [
  { kind: "hold", dur: 0.8, s: 0, gate: 0 },
  { kind: "run", s0: 0, s1: TRIP_S, run: "bad", dur: TRIP_S / SPEED },
  { kind: "trip", dur: 2.4, s: TRIP_S },
  { kind: "reset", dur: 0.9, s: TRIP_S },
  { kind: "run", s0: TRIP_S, s1: END_S, run: "fixed", dur: (END_S - TRIP_S) / SPEED },
  { kind: "hold", dur: 1.8, s: END_S, gate: 0, say: "fixed run · every gate holds" },
  { kind: "rewind", s0: END_S, s1: 0, dur: 1.6 },
];
// One calm motion for the site cards: the bad run is read until the gate trips, and stays tripped.
export const HOVER = [
  { kind: "run", s0: 0, s1: TRIP_S, run: "bad", dur: TRIP_S / SPEED },
  { kind: "trip", dur: 0.9, s: TRIP_S },
];
export const SETTLE = (s, gate) => [
  ...(gate > 0.01 ? [{ kind: "reset", dur: 0.7, s }] : []),
  ...(s > 0.5 ? [{ kind: "rewind", s0: s, s1: 0, dur: Math.min(1.4, 0.4 + s / 120) }] : []),
];

export const durationOf = (list) => list.reduce((sum, seg) => sum + seg.dur, 0);
export const REST_TEXT = `${NUMBERS.caught} of ${NUMBERS.vulnerable} caught · ${NUMBERS.passed} of ${NUMBERS.hardened} passed`;

function callAt(s) {
  let best = null;
  for (const r of ROWS) if (xOfRow(r.row, s) >= -HOLE.half) best = !best || r.row > best.row ? r : best;
  return best;
}

// The pose at time t into a segment list: roll position s, gate 0..1 (lever swing), flag 0..1 (drop).
export function poseAt(list, t) {
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
