# Halley project figures: the shared contract

Every open-source project on halleylabs.dev gets one anatomy figure: a real, well-made physical machine whose working IS the project's idea. They replace the old hand-drawn line plates. Fourteen figures sit side by side in one grid, so they must read as one set.

## Read first (in this order)
1. `www/vendor/anatomy/SKILL.md` (the skill; follow its workflow, craft rules and verification, all of it)
2. `www/vendor/anatomy/references/craft.md`, `references/kit.md`, `references/motion.md`, `references/verify.md`
3. `www/vendor/anatomy/examples/dial-indicator/build.mjs` (smallest complete figure), then `examples/test-rig/` (the quality bar)
4. The project's own data: `www/src/data/projects/<slug>.json` (summary, how it works, metrics). Every number the figure shows must come from there.

## Size
Each figure is a **Figure** in the skill's terms: one mechanism, 40 to 80 parts, highly detailed, no WebGL. Budget 45 to 90 minutes each.

## Files (per slug)
- `www/figures/<slug>/model.mjs`: the truth, a small pure module with the real numbers from the project JSON that drive the motion and readout.
- `www/figures/<slug>/build.mjs`: `node build.mjs` writes ALL of the outputs below. Import the kit from `../../vendor/anatomy/kit/iso-kit.mjs` (and `lathe.mjs`, `tube.mjs`, `audit.mjs` if used) and `../../vendor/anatomy/scripts/inline-kit.mjs`.
- Outputs:
  1. `www/src/figures/<slug>.svg`: the bare figure, `figureSvg({ width: 480, height: 320, label, body })` with NO `standalone` styles and NO card. Light theme. Every moving part carries a stable `data-part="..."` attribute so live code can find it.
  2. `www/src/figures/<slug>.live.js`: an ES module, `export function mount(root, { mode })` where `root` is an element that contains that svg. `mode` is `"hover"` (site cards: still at rest, plays one calm motion while the pointer is over `root`, settles back on leave) or `"tour"` (project page: an idle tour that loops, responds to pointer). It writes attributes on existing nodes (no re-render), runs only while visible (IntersectionObserver), stops under `prefers-reduced-motion`, and returns `{ destroy }`. If it needs kit functions (translateAlong etc.), import them from `../../vendor/anatomy/kit/iso-kit.mjs` with a relative path that works from `www/src/figures/`.
  3. `www/figures/<slug>/preview-light.html` and `preview.html` (dark): the full skill card via `plateHtml` + `pageHtml`, with the live behaviour inlined (tour mode), for verification.

## One set: shared camera, scale and frame
- Canvas **480 x 320** for every figure.
- Camera: azimuth 45 (35 to 60 allowed when the long side must show), elevation 30.
- Scale: the bench base plate is between **220 x 130 and 270 x 165 world units** for every figure, so all fourteen machines are drawn at the same scale. Fit with `fitProjection(..., 480, 320, { pad: 22, azimuth, elevation })`.
- Composition: the machine fills 55 to 65% of the frame, centred, with a soft halo under the base.
- Tones: base and feet `lo`, structure `mid`, subject `hi`, exactly ONE `lit` accent (the part to watch). **No colour at all** (no red, green or blue marks): the site reserves its only colour for its comet.
- Words: none in the drawing except at most one tiny engraved label plate. No arrows, balloons, leader lines or floating labels.

## Must pass before you report done
- Zero console errors on both preview pages.
- `node ../../vendor/anatomy/scripts/lines.mjs preview-light.html --out shots/lines-light.png` prints `line ends: 0` (and on `preview.html`).
- If you used pipes, cables or lathe parts: `node build.mjs --audit` ends `audit passed`.
- Captures with `vendor/anatomy/scripts/capture.mjs` / `drive.mjs`: desktop, 390-wide phone, and 4x close-ups of every junction, light theme first. READ every PNG you make. At 1x it must read instantly as one real machine; at 4x every region has true detail, no bare face or empty corner.
- Keep shots in `www/figures/<slug>/shots/`.

## Do not
- Touch any file outside `www/figures/<slug>/`, `www/src/figures/<slug>.svg` and `www/src/figures/<slug>.live.js`. The Astro integration is done by the orchestrator.
- Run the Astro dev server, git, npm install, or anything that publishes.
- Use em dashes or en dashes in any caption, title, hint or label. Write plain, impact-first English.

## Report back (short)
Slug, the object in one sentence, what moves and what that means, part count, check results (console, line ends, audit), and the paths of your best desktop and 4x shots.
