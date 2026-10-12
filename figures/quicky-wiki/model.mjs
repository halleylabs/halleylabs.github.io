// The truth behind the quicky-wiki figure.
// Source: www/src/data/projects/quicky-wiki.json. The project publishes no metrics, so the
// figure shows no numbers: it shows the mechanism in its own words. Each claim card stands
// as tall as its confidence; two claims that contradict each other sit on the balance, and
// the beam tips toward the claim with more confidence. The six belief events are the ones
// the project logs: created, reinforced, challenged, weakened, superseded, resolved.

export const EVENTS = ["created", "reinforced", "challenged", "weakened", "superseded", "resolved"];

// Confidence of each claim card in the drawer, back to front, between 0 and 1.
export const REST = [0.58, 0.16, 0.66, 0.42, 0.4, 0.74, 0.3];

// The two claims that contradict each other (their twins stand on the balance pans).
export const LEFT = 2;
export const RIGHT = 4;
// A claim that depends on LEFT: when LEFT weakens, it weakens with it.
export const DEPENDENT = 3;

// Card rise for confidence 1, in world units, and the beam's tilt per unit of difference.
export const RISE = 16;
export const TILT_PER = 15; // degrees of beam tilt per unit of confidence difference
export const TILT_MOST = 10; // the beam's stops, in degrees

// The idle tour: each step is one new source arriving, named by the event it logs.
const set = (base, changes) => base.map((value, index) => (index in changes ? changes[index] : value));
export const TOUR = [
  { say: "ingesting sources", c: REST },
  { say: "new source · claim created", c: set(REST, { 1: 0.56 }) },
  { say: "new source · claim reinforced", c: set(REST, { 1: 0.56, [LEFT]: 0.86, [RIGHT]: 0.36 }) },
  { say: "contradiction surfaced", c: set(REST, { 1: 0.56, [LEFT]: 0.7, [RIGHT]: 0.74 }) },
  { say: "claim weakened · dependents follow", c: set(REST, { 1: 0.56, [LEFT]: 0.4, [DEPENDENT]: 0.18, [RIGHT]: 0.8 }) },
  { say: "contradiction resolved", c: set(REST, { 1: 0.56, [LEFT]: 0.12, [DEPENDENT]: 0.14, [RIGHT]: 0.92 }) },
  { say: "claim superseded · decay", c: set(REST.map((v) => v * 0.82), { 1: 0.46, [LEFT]: 0.02, [DEPENDENT]: 0.1, [RIGHT]: 0.88 }) },
];
export const STEP_SECONDS = 2.6;

// Hover on the site cards: one new source challenges the left claim, then everything settles back.
export const HOVER = { say: "contradiction surfaced", c: set(REST, { [LEFT]: 0.44, [DEPENDENT]: 0.26, [RIGHT]: 0.86 }) };

export const tiltOf = (c) => Math.max(-TILT_MOST, Math.min(TILT_MOST, (c[RIGHT] - c[LEFT]) * TILT_PER));

export function sayOf(c) {
  const t = tiltOf(c);
  if (Math.abs(t) < 1.5) return "contradiction in the balance";
  return t > 0 ? "right claim outweighs left" : "left claim outweighs right";
}
