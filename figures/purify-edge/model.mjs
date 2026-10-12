// purify-edge: the truth behind the figure.
// Numbers come from www/src/data/projects/purify-edge.json.

export const METRICS = {
  vectors: 223, // DOMPurify's official test vectors
  identical: 223, // byte-identical to DOMPurify on jsdom: 223 of 223
  faster: "4.3x to 4.7x", // faster than DOMPurify on jsdom
  memory: "2.9x to 4.0x", // lower peak memory
  gzip: "65 KB", // bundle, gzipped, with parse5, DOMPurify and the DOM shim
};

// The rig: one drop is one test vector. It falls from the input funnel, through
// the stock cartridge (DOMPurify, unmodified), and out into the receiving flask.
export const DRIP = {
  idle: 1.25, // seconds between drops while the tour runs
  open: 0.32, // seconds between drops with the stopcock opened (pointer over the rig)
  form: 0.35, // a drop swells at the tip
  pass: 0.55, // time inside the funnel and cartridge before the clean drop forms
  fall: 0.32, // free fall from tip to mouth
};

// Receiving flask level, in s along the flask axis, from empty to all 223 vectors.
export const LEVEL = { empty: 2.6, full: 13.5 };
export const levelAt = (count) => LEVEL.empty + (LEVEL.full - LEVEL.empty) * Math.min(1, count / METRICS.vectors);

export const readoutOf = (count) => `vector ${count} of ${METRICS.vectors} · identical`;
