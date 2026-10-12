// The truth behind the Tring figure, from www/src/data/projects/tring.json.
// One YAML agent contract (the punched card) runs on three runtimes, switched by config
// (the selector). The card never changes; only the route does.

export const CARD_TEXT = "AGENT.YAML";

// Three runtimes from one spec: cascade, speech-to-speech or hybrid, switched by config.
// The default pipeline is the cascade (STT, LLM, TTS) on local open models: $0 per minute.
export const RUNTIMES = [
  { key: "cascade", name: "cascade", readout: "cascade · local · $0 per min" },
  { key: "speech-to-speech", name: "speech-to-speech", readout: "speech-to-speech · same card" },
  { key: "hybrid", name: "hybrid", readout: "hybrid · same card" },
];

export const DEFAULT_RUNTIME = 0;

// Selector stops, in radians on the kit's dial convention (0 points to -y, clockwise from above).
// The middle stop faces the front of the exchange; the others sit 45 degrees either side.
export const STOPS = [Math.PI * 1.25, Math.PI, Math.PI * 0.75];

// The wiper makes contact within this many radians of a stud.
export const CONTACT = (5 * Math.PI) / 180;

export const readoutAt = (index) => (index < 0 ? "switching · same card" : RUNTIMES[index].readout);

// Hollerith punch rows for the card, top to bottom: 12, 11, 0, 1 ... 9.
const ROWS = ["12", "11", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const ZONE = (ch) => {
  if (ch >= "A" && ch <= "I") return ["12", String(ch.charCodeAt(0) - 64)];
  if (ch >= "J" && ch <= "R") return ["11", String(ch.charCodeAt(0) - 73)];
  if (ch >= "S" && ch <= "Z") return ["0", String(ch.charCodeAt(0) - 81)];
  if (ch === ".") return ["12", "3", "8"];
  if (ch >= "0" && ch <= "9") return [ch];
  return [];
};
export const punchesOf = (text) => [...text].map((ch) => ZONE(ch).map((row) => ROWS.indexOf(row)));
export const ROW_COUNT = ROWS.length;
