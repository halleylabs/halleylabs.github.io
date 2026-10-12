// samemark: the truth behind the figure.
// Numbers come from www/src/data/projects/samemark.json.

export const METRICS = {
  endToEnd: "6.2x to 10.3x", // faster end to end, markdown to HTML, identical output
  streaming: "60x", // less main-thread time streaming a 30,000-character chat answer
  parsing: "28x to 47x", // faster parsing alone, same syntax tree
};

// The press: one stroke sets and prints one line; the ribbon then advances one
// line pitch. Lines already printed are never pressed again: the stream parser
// reuses every finished block and only parses the unfinished tail.
export const PITCH = 8; // ribbon advance per line, world units
export const HOLE_PITCH = 4; // tractor-feed hole spacing on the ribbon
export const STROKE = 7.5; // platen travel from rest to the paper
export const SWING = (70 * Math.PI) / 180; // fly bar turn for one stroke
export const ANSWER = 12; // lines in one streamed answer before the next starts

// One cycle, in seconds: press down, dwell on the paper, lift, feed one line, rest.
export const CYCLE = { down: 0.42, dwell: 0.16, up: 0.42, feed: 0.55, rest: 0.55 };
export const CYCLE_T = CYCLE.down + CYCLE.dwell + CYCLE.up + CYCLE.feed + CYCLE.rest;

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// Where the machine is at time c into a cycle.
export function phaseAt(c) {
  const { down, dwell, up, feed } = CYCLE;
  const t1 = down, t2 = t1 + dwell, t3 = t2 + up, t4 = t3 + feed;
  const press = c < t1 ? ease(c / down) : c < t2 ? 1 : c < t3 ? 1 - ease((c - t2) / up) : 0;
  const inked = c >= t1; // the impression has been made
  const advance = c < t3 ? 0 : c < t4 ? ease((c - t3) / feed) : 1;
  return { press, inked, advance };
}

// The answer being streamed, as markdown blocks set in type. Each line is a list
// of word spans across the ribbon (y from -9 to 9); kind sets how it is printed.
export const LINES = [
  { kind: "heading", spans: [[-9, -1.5], [0, 4]] },
  { kind: "text", spans: [[-9, -3.5], [-2, 3], [4.5, 9]] },
  { kind: "text", spans: [[-9, 0.5], [2, 9]] },
  { kind: "text", spans: [[-9, -5], [-3.5, 5]] },
  { kind: "item", spans: [[-6, -1], [0.5, 6]] },
  { kind: "item", spans: [[-6, 3.5]] },
  { kind: "item", spans: [[-6, -2.5], [-1, 7.5]] },
  { kind: "code", spans: [[-5, 2]] },
  { kind: "code", spans: [[-5, 6.5]] },
  { kind: "code", spans: [[-5, 0]] },
  { kind: "text", spans: [[-9, -2], [-0.5, 9]] },
  { kind: "text", spans: [[-9, 1.5]] },
];

// Readout: which line of the answer was printed last, and how many are kept.
export function readoutOf(newest) {
  const kept = newest - 1;
  return `line ${newest} of ${ANSWER} · ${kept} kept, 1 new`;
}
