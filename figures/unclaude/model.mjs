// UnClaude: the truth behind the figure.
// From www/src/data/projects/unclaude.json ("Each request is scored ... then sent to the cheapest
// model tier that can handle it") and the router it describes (src/unclaude/routing/scorer.py,
// RequestTier: simple, medium, complex, reasoning). The repo publishes no benchmark numbers,
// so the figure shows no savings figure: only which head each job gets.

export const TIERS = ["simple", "medium", "complex", "reasoning"];
// One tool head per tier, smallest (cheapest) to largest. Any model fits the same coupling,
// a local one included.
export const HEADS = ["small model", "mid model", "large model", "reasoning model"];

// The cheapest head that can handle the job is the one for its tier.
export const headFor = (tier) => tier;

// The tour: a run of jobs of mixed difficulty, so the arm swaps heads between most of them.
export const TOUR_JOBS = [2, 0, 3, 1];
export const REST_HEAD = 1;

export function readoutOf({ phase, tier, head }) {
  const job = tier === null ? "" : `${TIERS[tier]} job · `;
  if (phase === "return") return `${job}returning the ${HEADS[head]}`;
  if (phase === "fetch") return `${job}fetching the ${HEADS[head]}`;
  if (phase === "work") return `${job}${HEADS[head]} at work`;
  if (phase === "park") return `${HEADS[head]} mounted`;
  return `${job}routing`;
}
