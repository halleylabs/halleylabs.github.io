/*__LIB__*/
/*__DATA__*/

// AgentReplay live: writes attributes on the existing svg; one loop, only while visible.
export function mount(root, { mode = "tour" } = {}) {
  const { P } = DATA;
  const { poseAt, durationOf, fingersAt, TOUR, HOVER, SETTLE, REST_TEXT, GATE, LANE_Y } = AR;
  const qa = (sel) => [...root.querySelectorAll(sel)];
  const q = (sel) => root.querySelector(sel);
  const el = {
    pins: LANE_Y.map((_, i) => qa(`[data-part="pin${i}"]`)),
    head: qa(`[data-part="head${GATE}"]`),
    flag: qa('[data-part="flag"]'),
    lever: q('[data-part="lever"]'),
    holes: q('[data-part="holes"]'),
    spokes: { supply: q('[data-part="spokes-supply"]'), takeup: q('[data-part="spokes-takeup"]') },
    windows: { supply: q('[data-part="windows-supply"]'), takeup: q('[data-part="windows-takeup"]') },
  };
  const plate = root.closest(".iso-plate");
  const readout = root.querySelector("[data-readout]") || (plate && plate.querySelector("[data-readout]"));
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const REST = { s: 0, gate: 0, flag: 0, text: null };
  const shown = { ...REST };
  let target = { ...REST };
  let list = null;
  let looping = false;
  let t = 0;
  let after = null;
  let frame = 0;
  let last = 0;
  let visible = false;
  let resume = 0;
  let lastText = "";
  let drawnS = NaN;
  let drawnGate = NaN;
  const touring = () => mode === "tour" && !still.matches;

  function play(next, { loop = false, then = null } = {}) {
    list = next;
    looping = loop;
    after = then;
    t = 0;
    run();
  }
  const home = () => SETTLE(shown.s, Math.max(shown.gate, shown.flag));
  const startTour = () => play(home(), { then: () => play(TOUR, { loop: true }) });

  function setSolid(g, paths) {
    if (!g) return;
    for (const node of g.children) {
      const cls = node.getAttribute("class");
      if (cls === "iso-fill") node.setAttribute("d", paths.fill);
      else if (cls === "iso-shade") node.setAttribute("d", paths.shades[+node.getAttribute("data-shade")] || "");
      else if (cls === "iso-top") node.setAttribute("d", paths.top);
      else if (cls.includes("iso-crease")) node.setAttribute("d", paths.crease);
      else if (cls.includes("iso-bevel")) node.setAttribute("d", paths.bevel || "");
      else if (cls.includes("iso-edge")) node.setAttribute("d", paths.outline);
    }
  }
  const move = (nodes, by) => {
    const value = translateAlong(P, by);
    nodes.forEach((node) => node.setAttribute("transform", value));
  };

  function draw() {
    if (shown.s !== drawnS) {
      drawnS = shown.s;
      const f = fingersAt(shown.s);
      el.pins.forEach((nodes, i) => move(nodes, [0, 0, -(i === GATE ? DATA.gateTravel : DATA.travel) * f[i]]));
      move(el.head, [0, 0, -DATA.gateTravel * f[GATE]]);
      const hd = axisVector(P, [0, 0, -DATA.gateTravel * f[GATE]]);
      el.head.forEach((node) => holdStill(node, hd));
      el.holes && el.holes.setAttribute("d", AR.holesPath(shown.s, P));
      for (const key of ["supply", "takeup"]) {
        const marks = AR.spoolMarks(key, shown.s, P);
        el.spokes[key] && el.spokes[key].setAttribute("d", marks.spokes);
        el.windows[key] && el.windows[key].setAttribute("d", marks.windows);
      }
    }
    if (shown.gate !== drawnGate) {
      drawnGate = shown.gate;
      setSolid(el.lever, AR.leverPaths(shown.gate, P));
    }
    move(el.flag, [0, 0, -DATA.drop * shown.flag]);
    const fd = axisVector(P, [0, 0, -DATA.drop * shown.flag]);
    el.flag.forEach((node) => holdStill(node, fd));
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
      if (list.length) target = poseAt(list, looping ? t % span : t);
      if (!looping && t >= span) {
        list = null;
        if (after) {
          const next = after;
          after = null;
          next();
        }
      }
    }
    let moving = false;
    moving = follow("s", 0.04, dt) || moving;
    moving = follow("gate", 0.04, dt) || moving;
    moving = follow("flag", 0.03, dt) || moving;
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

  const holdTour = () => {
    clearTimeout(resume);
    if (mode === "tour") resume = setTimeout(() => touring() && startTour(), 6000);
  };
  const replay = (which) => {
    if (still.matches) return;
    holdTour();
    const runs = AR.TOUR.filter((seg) => seg.kind === "run");
    const bad = [runs[0], AR.TOUR.find((seg) => seg.kind === "trip")];
    const fixed = [{ kind: "rewind", s0: shown.s, s1: runs[1].s0, dur: 0.6 }, { ...runs[1] }];
    play(which === "bad" ? [...home(), ...bad] : [...(shown.gate > 0.01 || shown.flag > 0.01 ? [{ kind: "reset", dur: 0.6, s: shown.s }] : []), ...fixed]);
  };
  const enter = () => play(HOVER);
  const leave = () => play(home());
  const down = (event) => {
    if (event.button !== 0) return;
    replay("bad");
  };
  const key = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      replay("bad");
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      replay("fixed");
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
