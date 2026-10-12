// fasthands: the truth behind the figure.
// Numbers from www/src/data/projects/fasthands.json; geometry of the guard in world units.

export const FEWER_TOKENS = 91.3; // % fewer observation tokens than a screenshot loop, 120 verified runs
export const TRIALS = 20; // page-shift trials in the drift test
export const WRONG_GUARDED = 0; // wrong-button clicks with the hash guard
export const WRONG_UNGUARDED = 20; // wrong-button clicks without it

// The plate moves by one key pitch when the page shifts: the next key lands under the finger.
export const PITCH = 18;
// The feeler pin drops 12 into the registration hole, or 6 onto solid plate.
export const SEAT_DROP = 12;
export const CATCH_DROP = 6;
// Pin and hole: any offset past the clearance and the pin lands on solid plate.
export const PIN_R = 1.4;
export const HOLE_R = 2.0;
export const CLEARANCE = HOLE_R - PIN_R;
// The flag on the pin only reaches the fork sensor when the pin is fully seated.
export const TRIP_DROP = 11.4;
// The finger strokes from rest to the key top plus the key's own travel.
export const KEY_TRAVEL = 2.5;

export const seatedAt = (shift) => Math.abs(shift) <= CLEARANCE;
export const stopOf = (shift) => (seatedAt(shift) ? SEAT_DROP : CATCH_DROP);
export const tripped = (drop) => drop >= TRIP_DROP;
// The hash check holds the plate: it can only slide while the pin is clear of it.
export const clearOf = (drop) => drop < CATCH_DROP - 0.4;

const one = (value) => {
  const text = (Math.round(value * 10) / 10).toFixed(1);
  return text === "-0.0" ? "0.0" : text;
};

export function readoutOf({ shift, drop, press }) {
  const moved = Math.abs(shift) > 0.05;
  if (press > 0.02) return "pin seated · key pressed";
  if (drop >= CATCH_DROP - 0.05 && !seatedAt(shift)) return `moved ${one(shift)} px · pin caught · aborted`;
  if (tripped(drop)) return "pin seated · firing";
  if (drop > 0.3) return "checking the key";
  return moved ? `plate moved ${one(shift)} px` : "plate registered";
}

// Head cycle, seconds. The tour alternates a registered press with a shifted plate.
export const CYCLE = 3.6;
export const PIN_DOWN = [1.0, 1.55];
export const FIRE = [1.75, 2.05];
export const PIN_UP = 2.4;
export const pinWants = (t) => (t >= PIN_DOWN[0] && t < PIN_UP ? 1 : 0);
export const fireWants = (t) => (t >= FIRE[0] && t < FIRE[1] ? 1 : 0);
// The page shifts during the idle gap before the next press.
export const SHIFT_LEAD = 0.7;
export const tourShift = (clock) => (Math.floor((clock + SHIFT_LEAD) / CYCLE) % 2 === 0 ? 0 : PITCH);
