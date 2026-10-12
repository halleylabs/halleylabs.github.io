// The truth behind the sheetstream figure. Every number comes from src/data/projects/sheetstream.json.
// Pure: no DOM, no kit. The build bakes these into the live module.

export const ROWS = 1_000_000; // rows in the benchmark file (1M rows by 10 columns)
export const BATCH = 1000; // rows per batch crossing from Rust to JavaScript (the default)
export const BATCHES = ROWS / BATCH; // 1,000 batches
export const WRITE_MB = 82; // peak memory writing 1M rows
export const READ_MB = 93; // peak memory reading the same file
export const WRITE_S = 5.5; // seconds to write 1M rows
export const READ_S = 2.4; // seconds to read them back
export const OTHERS_MB = [749, 3300]; // what common JavaScript libraries need for the same write

// The drawing: a full stack is PACKETS packets, so each packet stands for BATCHES / PACKETS batches.
export const PACKETS = 8;
// The tour runs at one third of real time, so write and read keep their true ratio (5.5 s to 2.4 s).
export const SLOW = 3;
// The gauge reads 0 to 1,000 MB over 270 degrees, with a set pointer at the lightest common library.
export const DIAL_MAX_MB = 1000;
export const DIAL_SWEEP = (270 * Math.PI) / 180;
export const SET_POINTER_MB = OTHERS_MB[0];

export const packetSeconds = (dir) => ((dir > 0 ? WRITE_S : READ_S) * SLOW) / PACKETS;
export const SLIDE_SHARE = 0.7; // share of each packet's time spent crossing the rollers; the rest is the lift
export const peakOf = (dir) => (dir > 0 ? WRITE_MB : READ_MB);
export const dialShare = (mb) => Math.max(0, Math.min(mb, DIAL_MAX_MB)) / DIAL_MAX_MB;

const fmt = (n) => n.toLocaleString("en-US");
export const rowsDone = (progress) => Math.round(Math.max(0, Math.min(1, progress)) * BATCHES) * BATCH;

export function readoutOf({ dir, progress, done }) {
  const peak = peakOf(dir);
  if (done) return dir > 0 ? `wrote ${fmt(ROWS)} rows in ${WRITE_S} s · peak ${peak} MB` : `read ${fmt(ROWS)} rows in ${READ_S} s · peak ${peak} MB`;
  return `${dir > 0 ? "writing" : "reading"} · ${fmt(rowsDone(progress))} rows · peak ${peak} MB`;
}
