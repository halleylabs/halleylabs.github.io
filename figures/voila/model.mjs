// The truth behind the voila figure, from www/src/data/projects/voila.json.
// voila drives its own Chromium (the display), records at 2x pixel ratio with an animated
// cursor, follows the cursor with an eased zoom (the dolly tracks, the lens zooms), and
// narrates every step on-device with an ~80 MB voice model on the CPU (the loudspeaker),
// in any of six languages, switched per step.

export const VOICE_MB = 80; // "~80 MB voice model narrates on a CPU"
export const PIXEL_RATIO = 2; // "streams frames over the DevTools Protocol at 2x pixel ratio"

// "Kokoro speaks English (US/UK), Spanish, French, Italian, Portuguese and Hindi": six languages.
export const LANGS = ["en", "es", "fr", "it", "pt", "hi"];

// The page on the display, in screen units (u across from the left, v down from the top)
// of a 74 x 44.5 screen. These are the things the cursor visits.
export const SCREEN = { w: 74, h: 44.5 };
export const PAGE = {
  bar: { u: 0, v: 0, w: 74, h: 4.4 },
  url: { u: 10, v: 1.2, w: 40, h: 2, r: 1 },
  logo: { u: 4, v: 6.8, w: 9, h: 2.4, r: 0.6 },
  links: [44, 51, 58].map((u) => ({ u, v: 7.4, w: 5, h: 1.2, r: 0.4 })),
  cta: { u: 64.5, v: 6.6, w: 7, h: 2.8, r: 1.4 },
  heading: [{ u: 6, v: 13, w: 34, h: 3, r: 0.5 }, { u: 6, v: 17.4, w: 26, h: 3, r: 0.5 }],
  copy: [{ u: 6, v: 23, w: 32, h: 1, r: 0.4 }, { u: 6, v: 25.4, w: 28, h: 1, r: 0.4 }],
  button: { u: 6, v: 29, w: 12, h: 3.6, r: 1.8 },
  hero: { u: 44, v: 12, w: 26, h: 20, r: 1.2 },
  cards: [6, 28, 50].map((u) => ({ u, v: 36, w: 20, h: 6.4, r: 1 })),
};

// A tour: the cursor visits targets on the page, and each step is narrated in its own
// language, one line per step, so the six languages mix in one recording.
const centre = (box) => ({ u: box.u + box.w / 2, v: box.v + box.h / 2 });
export const STEPS = [
  { target: "heading.0", at: centre({ u: 6, v: 13, w: 34, h: 7.4 }), lang: 0 },
  { target: "hero", at: centre(PAGE.hero), lang: 1 },
  { target: "button", at: centre(PAGE.button), lang: 2 },
  { target: "cards.1", at: centre(PAGE.cards[1]), lang: 3 },
  { target: "cards.2", at: centre(PAGE.cards[2]), lang: 4 },
  { target: "cta", at: centre(PAGE.cta), lang: 5 },
];
export const REST_AT = { u: SCREEN.w / 2, v: SCREEN.h / 2 };

// Seconds per phase of a step. The narration lasts as long as its spoken clip, so the
// step is timed by the voice, not the other way round.
export const PHASES = { track: 1.3, zoom: 0.8, speak: 1.6, out: 0.7 };
export const STEP_SECONDS = PHASES.track + PHASES.zoom + PHASES.speak + PHASES.out;

export const phaseAt = (t) => {
  const index = Math.floor(t / STEP_SECONDS) % STEPS.length;
  let local = t % STEP_SECONDS;
  for (const name of ["track", "zoom", "speak", "out"]) {
    if (local < PHASES[name]) return { index, name, share: local / PHASES[name] };
    local -= PHASES[name];
  }
  return { index, name: "out", share: 1 };
};

export const readoutOf = (phase, index) => {
  const lang = LANGS[STEPS[index].lang];
  if (phase === "track") return "following the cursor";
  if (phase === "zoom") return `zooming in · ${PIXEL_RATIO}x frames`;
  if (phase === "speak") return `narrating ${lang} · ${STEPS[index].lang + 1} of ${LANGS.length}`;
  return `~${VOICE_MB} MB voice · on the CPU`;
};

export const REST_READOUT = `~${VOICE_MB} MB voice · ${LANGS.length} languages`;
