/*__LIB__*/
/*__DATA__*/

// witness live: writes attributes on the existing svg; one loop, only while visible.
export function mount(root, { mode = "tour" } = {}) {
  const { P } = DATA;
  const { TAPE, packOf, turnsOf, poseAt, durationOf, seg, TOUR, HOVER, REST_TEXT } = WT;
  const qa = (sel) => [...root.querySelectorAll(sel)];
  const q = (sel) => root.querySelector(sel);
  const el = {
    button: qa('[data-part="button"]'),
    pinch: qa('[data-part="pinch"]'),
    keys: Object.fromEntries(["rew", "stop", "play", "rec"].map((name) => [name, qa(`[data-part="key-${name}"]`)])),
    pack: { supply: q('[data-part="pack-supply"]'), takeup: q('[data-part="pack-takeup"]') },
    spokes: { supply: q('[data-part="spokes-supply"]'), takeup: q('[data-part="spokes-takeup"]') },
    splice: { supply: q('[data-part="splice-supply"]'), takeup: q('[data-part="splice-takeup"]') },
    holes: { supply: qa('[data-part="holes-supply"] circle'), takeup: qa('[data-part="holes-takeup"] circle') },
    tape: q('[data-part="tape"]'),
    needle: q('[data-part="needle"]'),
  };
  const plate = root.closest(".iso-plate");
  const readout = root.querySelector("[data-readout]") || (plate && plate.querySelector("[data-readout]"));
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const centre = { supply: WT.SUPPLY, takeup: WT.TAKEUP };

  const REST = { L: TAPE.rest, button: 0, rec: 0, play: 0, rew: 0, stop: 0, pinch: 0, needle: 0, text: null, done: true };
  const shown = { ...REST };
  let target = { ...REST };
  let list = null;
  let looping = false;
  let t = 0;
  let L0 = TAPE.rest;
  let after = null;
  let frame = 0;
  let last = 0;
  let visible = false;
  let resume = 0;
  let lastText = "";
  const touring = () => mode === "tour" && !still.matches;

  function play(next, { loop = false, then = null } = {}) {
    list = next;
    looping = loop;
    after = then;
    t = 0;
    L0 = shown.L;
    run();
  }
  const back = (to = TAPE.rest) => (Math.abs(shown.L - to) > 0.5 ? [seg("seek", { dL: to - shown.L, dur: 0.7 })] : []);
  const startTour = () => play(back(), { then: () => play(TOUR, { loop: true }) });

  function setSolid(g, paths) {
    if (!g) return;
    const c = g.children;
    c[0].setAttribute("d", paths.fill);
    for (let i = 0; i < 4; i++) c[1 + i].setAttribute("d", paths.shades[i] || "");
    c[5].setAttribute("d", paths.top);
    c[6].setAttribute("d", paths.crease);
    c[7].setAttribute("d", paths.outline);
  }
  const move = (nodes, by) => {
    const value = translateAlong(P, by);
    nodes.forEach((node) => node.setAttribute("transform", value));
  };

  let drawnL = NaN;
  function draw() {
    move(el.button, [0, 0, -DATA.button * shown.button]);
    move(el.pinch, [0, DATA.pinch * (1 - shown.pinch), 0]);
    for (const name of ["rew", "stop", "play", "rec"]) move(el.keys[name], [0, 0, -DATA.key * shown[name]]);
    if (el.needle) el.needle.setAttribute("d", WT.needlePath(shown.needle, P));
    if (shown.L !== drawnL) {
      drawnL = shown.L;
      const r = packOf(shown.L);
      const turn = turnsOf(shown.L);
      for (const key of ["supply", "takeup"]) {
        setSolid(el.pack[key], WT.packPaths(centre[key], r[key], P));
        const marks = WT.reelMarks(centre[key], r[key], -turn[key], P);
        el.spokes[key] && el.spokes[key].setAttribute("d", marks.spokes);
        el.splice[key] && el.splice[key].setAttribute("d", marks.splice);
        el.holes[key].forEach((node, i) => {
          node.setAttribute("cx", marks.holes[i][0].toFixed(1));
          node.setAttribute("cy", marks.holes[i][1].toFixed(1));
        });
      }
      setSolid(el.tape, WT.tapePaths(r.supply, r.takeup, P));
    }
    const text = target.text || REST_TEXT;
    if (readout && text !== lastText) readout.textContent = lastText = text;
  }

  const follow = (key, tau, dt) => {
    const goal = target[key];
    shown[key] += (goal - shown[key]) * (1 - Math.exp(-dt / tau));
    if (Math.abs(goal - shown[key]) < 1e-3) shown[key] = goal;
    return shown[key] !== goal;
  };

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (list) {
      t += dt;
      const span = durationOf(list);
      const local = looping ? t % span : t;
      target = poseAt(list, local, L0);
      if (!looping && t >= span) {
        list = null;
        target = { ...REST, L: target.L };
        if (after) {
          const next = after;
          after = null;
          next();
        }
      }
    }
    let moving = false;
    moving = follow("L", 0.06, dt) || moving;
    for (const key of ["button", "rec", "play", "rew", "stop", "pinch", "needle"]) moving = follow(key, 0.07, dt) || moving;
    draw();
    frame = visible && (list || moving) ? requestAnimationFrame(tick) : 0;
  }
  function run() {
    if (!frame && visible && !still.matches) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  }, { rootMargin: "120px 0px" });
  io.observe(root);

  // Interaction
  const holdTour = () => {
    clearTimeout(resume);
    if (mode === "tour") resume = setTimeout(() => touring() && startTour(), 3600 + 2400);
  };
  const again = () => {
    if (still.matches) return;
    holdTour();
    play([...back(), seg("hit", { n: 1 })]);
  };
  const fresh = () => {
    if (still.matches) return;
    holdTour();
    play([...(shown.L > TAPE.rest + 3 * TAPE.perCall ? back() : []), seg("miss", { n: 1 })]);
  };
  const enter = () => play(HOVER);
  const leave = () => play(back());
  const down = (event) => {
    if (event.button !== 0) return;
    again();
  };
  const key = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      again();
    } else if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      fresh();
    }
  };
  if (mode === "hover") {
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
  } else {
    root.addEventListener("pointerdown", down);
    root.addEventListener("keydown", key);
    if (touring()) startTour();
  }
  draw();

  return {
    destroy() {
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resume);
      io.disconnect();
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("keydown", key);
    },
  };
}
