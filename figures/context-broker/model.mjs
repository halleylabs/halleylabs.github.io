// The truth behind the context-broker figure.
// Source: www/src/data/projects/context-broker.json.
//   "91 tokens to read a 102,448-token file as an exact outline"
//   "~1 ms to outline an 800-line file, with no second model in the loop"
//   "89% fewer tokens on big-file reads in a 506k-line monorepo"
// The figure is a key-duplicating machine. The master key is the big file: long, thick and
// heavily cut. A stylus rides its cut edge, and the cutting wheel copies that edge, cut for
// cut, onto a slim skeleton blank. Nothing interprets the shape: the carriage simply follows
// the stylus, the way the hook copies verbatim lines with their real line numbers.

export const FULL_TOKENS = 102448;
export const SKELETON_TOKENS = 91;
export const OUTLINE_MS = "~1 ms";
export const SAVED_REPO = 89; // percent, across the monorepo run

// The bitting both keys share: cut positions along the blade (from the shoulder) and depths.
export const BLADE = 50; // blade length, shoulder to tip
export const CUTS = [
  [6.8, 2.9],
  [10.9, 4.6],
  [15, 1.4],
  [19.1, 3.8],
  [23.2, 1],
  [27.3, 4.3],
  [31.4, 2.4],
  [35.5, 4.7],
  [39.6, 1.9],
  [43.7, 3.4],
];
export const FLAT = 0.6; // half width of each cut's flat bottom
export const TIP = 4; // the tip chamfer runs over the last 4 units

// depth of the cut edge at s (0 = uncut edge), the same function for master and copy
export function depthAt(s) {
  let d = 0;
  for (const [at, depth] of CUTS) d = Math.max(d, depth - Math.max(0, Math.abs(s - at) - FLAT));
  if (s > BLADE - TIP) d = Math.max(d, ((s - (BLADE - TIP)) / TIP) * 2.6);
  return Math.max(0, d);
}

// The cycle: the carriage carries both keys past the stylus and the wheel (u: 0 to 1 along the
// blade), backs off, returns, and a fresh blank goes in.
export const STROKE_SECONDS = 3.2;
export const HOLD_SECONDS = 1.6;
export const RETURN_SECONDS = 1.6;
export const SWAP_SECONDS = 1;

export const tokensAt = (u) => Math.round(SKELETON_TOKENS * Math.max(0, Math.min(1, u)));
export const fmt = (n) => n.toLocaleString("en-US");
