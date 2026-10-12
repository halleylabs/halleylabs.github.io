// The truth behind the pact figure. Every number comes from src/data/projects/pact.json.
// Pure: no DOM, no kit. The build bakes these into the live module.

export const NETWORK_CALLS = 0; // network calls to verify identity, delegation chain and request
export const DEPENDENCIES = 0; // third-party dependencies in the Go library
export const MIDDLEWARE_LINES = 1; // lines of middleware to protect a route

// The chain, in the order the provider walks it. Each seal is narrower than the one before it:
// the human holds the root key, the delegation names two capabilities for the agent
// ("github:pr:create,repo=myorg/*;storage:read" in the quickstart), and a request uses one of them.
export const SEALS = [
  { id: "human", r: 20, marks: 6, say: "seal 1 · human · signature ok" },
  { id: "agent", r: 15, marks: 2, say: "seal 2 · agent · narrower · ok" },
  { id: "request", r: 10, marks: 1, say: "seal 3 · request · fresh · ok" },
];

export const SAY = {
  sign: "agent signs the request",
  walk: (n) => `checking seal ${n} of ${SEALS.length}`,
  done: `verified offline · ${NETWORK_CALLS} network calls`,
};

// The idle tour, in seconds: sign the request, then walk the chain seal by seal.
export const TOUR = [
  { at: 0, seal: 0, ram: 0, device: 0 },
  { at: 0.7, seal: 0, ram: 1, device: 0 },
  { at: 1.9, seal: 0, ram: 0, device: 1 },
  { at: 3.0, seal: 0, ram: 0, device: 1, check: true },
  { at: 4.2, seal: 1, ram: 0, device: 1, check: true },
  { at: 5.6, seal: 2, ram: 0, device: 1, check: true },
  { at: 7.0, seal: 2, ram: 0, device: 1, done: true },
  { at: 9.2, seal: 0, ram: 0, device: 1, done: true },
];
export const TOUR_LENGTH = 10.6;
export const tourAt = (t) => {
  const time = ((t % TOUR_LENGTH) + TOUR_LENGTH) % TOUR_LENGTH;
  let step = TOUR[0];
  for (const s of TOUR) if (time >= s.at) step = s;
  return step;
};
