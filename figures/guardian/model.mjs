// guardian, the truth behind the figure.
// From src/data/projects/guardian.json: one call fans out four parallel judgments (destructive,
// off_task, injection, leak) in about 400 ms per action; policy blocks at risk >= 0.7, asks at
// >= 0.4 and allows below; on the 44-action benchmark it caught 100% of hazardous actions with
// 0% of legitimate work blocked.
// The checkpoint: each proposed action is a token on a short conveyor. It stops under a bridge
// with four inspection heads side by side, all four probes read it at once for 400 ms, then a
// gate arm lifts for a safe token or stays down for a hazardous one, which a pusher clears into
// a reject bin. Nothing hazardous reaches the far end of the belt.

export const JUDGMENTS = ["destructive", "off_task", "injection", "leak"];
export const READ_MS = 400;
export const BLOCK_AT = 0.7;
export const ASK_AT = 0.4;
export const CAUGHT = 100;
export const LEGIT_BLOCKED = 0;
export const BENCHMARK = 44;

// Stations along the belt (world x).
export const BELT_TOP = 16;
export const TOKEN = { len: 14, wide: 30, h: 6 };
export const INSPECT = -20; // under the bridge
export const GATE = 45; // gate arm axis
export const ARM_HALF = 1.5;
export const STOP = GATE - ARM_HALF - TOKEN.len / 2 - 0.2; // a held token rests against the arm
export const SPACING = 92; // tokens leave the infeed this far apart on the belt
export const MOUTH_IN = -82; // infeed hood mouth
export const MOUTH_OUT = 82; // outfeed hood mouth
export const PROBES = [-12.6, -4.2, 4.2, 12.6]; // four heads side by side across the belt
export const BIN_Y = 44; // a pushed token's centre over the reject bin
export const BIN_FLOOR = 1.5;

// The rest pose: a hazardous token held at the gate, the next one on its way.
export const REST_TOKENS = [0, 1, 2, 3, 4].map((i) => STOP - i * SPACING);

// Timing (seconds).
export const T = {
  beltSpeed: 42, // units per second at the middle of a move
  probeDown: 0.18,
  read: READ_MS / 1000,
  probeUp: 0.18,
  armUp: 0.75,
  armDown: 0.6,
  push: 0.95,
  retract: 0.7,
  settle: 0.35,
};
export const moveTime = (distance) => 0.5 + Math.abs(distance) / T.beltSpeed;

// The tour: verdicts for the tokens as they reach the heads, in order. It loops.
export const TOUR = ["allow", "block", "allow", "allow", "block"];
// A site card plays one allowed token and one hazardous one, which brings it back to rest.
export const HOVER = ["allow", "block"];

export function verdictText(verdict) {
  return verdict === "block" ? `blocked · risk ≥ ${BLOCK_AT}` : `allowed · risk < ${ASK_AT}`;
}
export const READING_TEXT = `${JUDGMENTS.length} checks at once · ${READ_MS} ms`;
export const REST_TEXT = `${CAUGHT}% caught · ${LEGIT_BLOCKED}% wrongly blocked`;
