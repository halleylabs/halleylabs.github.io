// witness: the truth that drives the figure.
// Numbers from src/data/projects/witness.json (README demo and bench).
export const NUMBERS = {
  missMs: 803, // a call that reaches the model API: 803 ms
  hitUs: 541, // the same call served from the record: 541 µs
  addedMs: 0.25, // median added per call to record everything
  perSec: 53000, // recorded calls per second on one machine
};

// The tape: a reel pack is a spiral, so its radius grows with the square root of the length wound.
export const TAPE = { hub: 7.5, full: 20, c: 0.09, rest: 600, perCall: 75 };
export const packOf = (L) => ({
  supply: Math.sqrt(TAPE.full * TAPE.full - TAPE.c * L),
  takeup: Math.sqrt(TAPE.hub * TAPE.hub + TAPE.c * L),
});
// Angle each reel has turned for L units of tape moved: dθ = dL / r, integrated in closed form.
export const turnsOf = (L) => {
  const p = packOf(L);
  return { supply: (2 / TAPE.c) * (TAPE.full - p.supply), takeup: (2 / TAPE.c) * (p.takeup - TAPE.hub) };
};

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const ramp = (t, a, b) => ease((t - a) / (b - a));
// up from a to b, held, down from c to d
const bump = (t, a, b, c, d) => Math.min(ramp(t, a, b), 1 - ramp(t, c, d));

const MISS_UP = 0.3;
const MISS_DOWN = MISS_UP + NUMBERS.missMs / 1000; // the needle holds for the true 803 ms

export const KINDS = {
  // A new call: the line runs to the model, the model is paid, the answer is recorded to tape.
  miss: { dur: 2.1, dL: TAPE.perCall },
  // A repeat call: cued from the tape, the line to the model stays idle.
  hit: { dur: 1.0, dL: TAPE.perCall },
  seek: { dur: 1.3 },
  crash: { dur: 1.0, dL: 0 },
  done: { dur: 1.6, dL: 0 },
  pause: { dur: 0.6, dL: 0 },
};

export const seg = (kind, extra = {}) => ({ kind, dur: KINDS[kind].dur, dL: KINDS[kind].dL ?? 0, ...extra });

// The idle tour: a run makes three new calls (each paid and recorded), crashes,
// and resumes by replaying the same three calls from tape with zero model calls.
export const TOUR = [
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
export const HOVER = [seg("miss", { n: 1 }), seg("seek", { dL: -TAPE.perCall, dur: 0.9, say: "cueing the record" }), seg("hit", { n: 1 })];

export const durationOf = (list) => list.reduce((sum, s) => sum + s.dur, 0);

export const REST_TEXT = "803 ms paid once · 541 µs after";

// The pose at time t into a list of segments that starts with L0 of tape wound.
export function poseAt(list, t, L0 = TAPE.rest) {
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
