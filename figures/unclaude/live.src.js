import { translateAlong, iso, extrude, onTop, towardViewer } from "../../vendor/anatomy/kit/iso-kit.mjs";

const G = /*DATA*/;

/*MODEL*/

/*RIG*/

export function mount(root, { mode = "hover" } = {}) {
  const svg = root && root.querySelector("svg");
  if (!svg) return { destroy() {} };
  const P = G.P;
  const project = (point) => iso(point, P);
  const view = towardViewer(P);
  const one = (name) => svg.querySelector(`[data-part="${name}"]`);
  const bench = one("bench");
  const nodes = new Map([...bench.children].map((node) => [node.getAttribute("data-item"), node]));
  const links = ["link1", "link2"].map((name) => ({ solid: one(name), groove: one(`${name}-groove`), dots: [...svg.querySelectorAll(`[data-part="${name}-dot"]`)] }));
  const elbow = one("elbow");
  const quillTop = one("quill-top");
  const quillLow = one("quill-low");
  const shafts = [...svg.querySelectorAll('[data-part="shaft"]')];
  const heads = G.heads.map((_, index) => one(`head-${index}`));
  const plate = root.closest(".iso-plate");
  const readout = plate ? plate.querySelector("[data-readout]") : null;
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const rest = reach(G.W, G.S, G.L1, G.L2, G.hand);
  const st = { a1: rest.a1, bend: rest.bend, z: G.restZ, mounted: REST_HEAD, want: REST_HEAD, tier: null, phase: "park" };
  let steps = [];
  let step = null;
  let stepT = 0;
  let from = null;
  let pending = null;
  let tourAt = 0;
  let touring = mode === "tour";
  let resume = 0;
  let frame = 0;
  let last = 0;
  let visible = false;
  let said = "";
  let lastOrder = "";
  let litHead = -1;

  const ease = (u) => { const t = Math.min(1, Math.max(0, u)); return t * t * (3 - 2 * t); };
  const dockZ = (i) => G.cradleTop + G.headH[i];
  const workZ = (i) => G.workTop + G.headH[i];

  function plan(tier) {
    const parking = tier === null;
    const want = parking ? REST_HEAD : headFor(tier);
    const out = [{ kind: "route", head: want, tier, phase: parking ? "park" : "route" }, { kind: "wait", dur: parking ? 0.1 : 0.55 }];
    out.push({ kind: "z", to: G.safe });
    if (st.mounted !== want) {
      if (st.mounted !== null) {
        out.push({ kind: "go", to: G.docks[st.mounted], phase: "return", head: st.mounted });
        out.push({ kind: "z", to: dockZ(st.mounted) }, { kind: "release" }, { kind: "wait", dur: 0.2 }, { kind: "z", to: G.safe });
      }
      out.push({ kind: "go", to: G.docks[want], phase: "fetch", head: want });
      out.push({ kind: "z", to: dockZ(want) }, { kind: "couple", head: want }, { kind: "wait", dur: 0.2 }, { kind: "z", to: G.safe });
    }
    if (parking) {
      out.push({ kind: "go", to: G.W, phase: "park", head: want }, { kind: "z", to: G.restZ });
    } else {
      out.push({ kind: "go", to: G.W, phase: st.mounted === want ? "work" : "fetch", head: want }, { kind: "phase", phase: "work" }, { kind: "z", to: workZ(want) });
      for (let i = 0; i < 2; i++) out.push({ kind: "z", to: workZ(want) + 2.5, dur: 0.22 }, { kind: "z", to: workZ(want), dur: 0.22 });
      out.push({ kind: "wait", dur: 0.3 }, { kind: "z", to: G.restZ }, { kind: "wait", dur: 0.9 });
    }
    return out;
  }

  function begin(next) {
    step = next;
    stepT = 0;
    from = { a1: st.a1, bend: st.bend, z: st.z };
    if (step.kind === "go") {
      const target = reach(step.to, G.S, G.L1, G.L2, G.hand);
      step.a1 = from.a1 + wrap(target.a1 - from.a1);
      step.bend = from.bend + wrap(target.bend - from.bend);
      step.dur = 0.6 + 0.5 * Math.max(Math.abs(step.a1 - from.a1), Math.abs(step.bend - from.bend));
      st.phase = step.phase;
      st.shown = step.head;
    } else if (step.kind === "z") {
      step.dur = step.dur || 0.28 + Math.abs(step.to - from.z) * 0.018;
    } else if (step.kind === "route") {
      st.want = step.head; st.tier = step.tier; st.phase = step.phase; st.shown = step.head; step.dur = 0;
    } else if (step.kind === "phase") {
      st.phase = step.phase; step.dur = 0;
    } else if (step.kind === "release") {
      st.mounted = null; step.dur = 0;
    } else if (step.kind === "couple") {
      st.mounted = step.head; step.dur = 0;
    }
  }

  function advance(dt) {
    let left = dt;
    for (let guard = 0; guard < 8; guard++) {
      if (!step) {
        if (pending !== undefined && pending !== null) { steps = plan(pending.tier); pending = null; }
        else if (!steps.length && touring) { steps = plan(TOUR_JOBS[tourAt++ % TOUR_JOBS.length]); }
        if (!steps.length) return false;
        begin(steps.shift());
      }
      stepT += left;
      const u = step.dur ? ease(stepT / step.dur) : 1;
      if (step.kind === "go") {
        st.a1 = from.a1 + (step.a1 - from.a1) * u;
        st.bend = from.bend + (step.bend - from.bend) * u;
      } else if (step.kind === "z") {
        st.z = from.z + (step.to - from.z) * u;
      }
      if (stepT < step.dur) return true;
      left = stepT - step.dur;
      step = null;
    }
    return true;
  }

  function setSolid(node, paths) {
    for (const child of node.children) {
      const key = child.getAttribute("data-k");
      const d = key === "fill" ? paths.fill : key === "top" ? paths.top : key === "crease" ? paths.crease : key === "bevel" ? paths.bevel || "" : key === "edge" ? paths.outline : key && key.startsWith("shade") ? paths.shades[Number(key.slice(5))] || "" : null;
      if (d !== null) child.setAttribute("d", d);
    }
  }

  function draw() {
    const pose = { a1: st.a1, bend: st.bend, z: st.z };
    const where = G.heads.map((_, i) => (st.mounted === i ? null : { at: G.docks[i], bottom: G.cradleTop }));
    const { E, Q } = joints(pose, G.S, G.L1, G.L2);
    G.heads.forEach((_, i) => { if (!where[i]) where[i] = { at: Q, bottom: st.z - G.headH[i] }; });
    const spans = [[G.S, E, G.link1R, G.link1Rb, G.L1Z], [E, Q, G.link2R, G.link2Rb, G.L2Z]];
    spans.forEach(([a, b, ra, rb, [z0, z1]], index) => {
      const link = links[index];
      setSolid(link.solid, extrude(stadium(a, b, ra, rb), z0, z1 - z0, P, { convex: true, bevel: 0.6 }));
      link.groove.setAttribute("d", onTop(stadium(a, b, ra - 2.6, rb - 2.6), z1, P, true));
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const along = G.dotAlong[index];
      const spots = [[along, -G.dotAcross[index]], [along, G.dotAcross[index]]].map(([s, t]) => project([a[0] + Math.cos(ang) * s - Math.sin(ang) * t, a[1] + Math.sin(ang) * s + Math.cos(ang) * t, z1]));
      link.dots.forEach((dot, k) => { dot.setAttribute("cx", spots[k][0].toFixed(1)); dot.setAttribute("cy", spots[k][1].toFixed(1)); });
    });
    elbow.setAttribute("transform", translateAlong(P, [E[0], E[1], 0]));
    const q = translateAlong(P, [Q[0], Q[1], 0]);
    quillTop.setAttribute("transform", q);
    quillLow.setAttribute("transform", q);
    const lift = translateAlong(P, [0, 0, st.z - G.restZ]);
    for (const node of shafts) node.setAttribute("transform", lift);
    heads.forEach((node, i) => {
      const w = where[i];
      const dx = w.at[0] - G.docks[i][0], dy = w.at[1] - G.docks[i][1], dz = w.bottom - G.cradleTop;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 1e-3) node.removeAttribute("transform");
      else node.setAttribute("transform", translateAlong(P, [dx, dy, dz]));
    });
    if (st.want !== litHead) {
      heads.forEach((node, i) => node.querySelectorAll(".iso-solid").forEach((solid) => { if (i === st.want) solid.setAttribute("data-lit", ""); else solid.removeAttribute("data-lit"); }));
      litHead = st.want;
    }
    const { list } = itemsOf(pose, where, G);
    const order = orderOf(list, project, view);
    const key = order.join(",");
    if (key !== lastOrder) {
      lastOrder = key;
      for (const index of order) bench.appendChild(nodes.get(list[index].name));
    }
    const text = readoutOf({ phase: st.phase, tier: st.tier, head: st.shown ?? st.want });
    if (text !== said) {
      said = text;
      if (readout) readout.textContent = text;
      root.setAttribute("aria-valuetext", text);
    }
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const moving = advance(dt);
    draw();
    frame = visible && (moving || step || steps.length || touring) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };

  const observer = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: "120px 0px" });
  observer.observe(root);

  const listeners = [];
  const on = (type, fn) => { root.addEventListener(type, fn); listeners.push([type, fn]); };
  let chosen = null;
  const choose = (tier) => {
    if (tier === chosen) return;
    chosen = tier;
    touring = false;
    steps = [];
    pending = { tier };
    clearTimeout(resume);
    resume = setTimeout(() => { touring = true; chosen = null; run(); }, 3600);
    run();
  };
  if (mode === "hover") {
    on("pointerenter", () => { if (!touring) { touring = true; tourAt = 0; steps = []; pending = null; } run(); });
    on("pointerleave", () => { touring = false; steps = []; pending = { tier: null }; run(); });
  } else {
    on("pointermove", (event) => {
      const box = svg.getBoundingClientRect();
      const share = Math.min(0.999, Math.max(0, ((event.clientX - box.left) / box.width - 0.2) / 0.6));
      choose(Math.floor(share * TIERS.length));
    });
    on("keydown", (event) => {
      const now = chosen ?? st.tier ?? REST_HEAD;
      let to = null;
      if (event.key >= "1" && event.key <= String(TIERS.length)) to = Number(event.key) - 1;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(TIERS.length - 1, now + 1);
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, now - 1);
      if (to === null) return;
      event.preventDefault();
      chosen = null;
      choose(to);
    });
  }
  draw();
  run();

  return {
    destroy() {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resume);
      for (const [type, fn] of listeners) root.removeEventListener(type, fn);
    },
  };
}
