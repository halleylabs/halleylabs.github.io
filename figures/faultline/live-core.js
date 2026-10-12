// Live behaviour, inlined into faultline.live.js after the model and flag sources.
// Needs: DATA, P, the model (route, timeline, poseAt, pushOn, readoutOf, TOUR, HOVER_MOVE, HOME,
// SWITCHES, PIVOT_Z, BAYS), flagSolids, and the kit's slabOf, translateAlong, depthOf.

function setSolid(g, paths) {
  if (!g) return;
  const nodes = g.children;
  nodes[0].setAttribute("d", paths.fill);
  for (let i = 0; i < 4; i++) nodes[1 + i].setAttribute("d", paths.shades[i] || "");
  nodes[5].setAttribute("d", paths.top);
  nodes[6].setAttribute("d", paths.crease || "");
  nodes[7].setAttribute("d", paths.bevel || "");
  nodes[8].setAttribute("d", paths.outline);
}

export function mount(root, { mode = "hover" } = {}) {
  const svg = root.querySelector("svg");
  const q = (name) => svg.querySelector(`[data-part="${name}"]`);
  const nodes = {
    shadow: q("shadow"),
    carriage: q("carriage"),
    beamBack: q("beam-back"),
    beamFront: q("beam-front"),
    cross: q("cross"),
    head: q("head"),
    slider: q("slider"),
    cap: q("cap"),
    switches: SWITCHES.map((sw) => ({ sw, g: q(sw.id), lever: q(`${sw.id}-lever`), flag: q(`${sw.id}-flag`), a: 0, v: 0, shown: 0 })),
  };
  const plate = root.closest(".iso-plate");
  const readout = (plate && plate.querySelector("[data-readout]")) || root.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const [RX, RY, RZ] = DATA.REST;
  const B = DATA.BEAM;

  let bay = HOME;
  let line = null;
  let t = 0;
  let tourIndex = -1;
  let fromTour = false;
  let touring = mode === "tour" && !still.matches;
  let tourWait = 1.4;
  let want = null;
  let pose = [RX, RY, RZ];
  let tag = "rest";
  let lit = SWITCHES[0].id;
  let frame = 0;
  let last = 0;
  let visible = false;
  let order = "";
  let resume = 0;
  let lastText = "";

  const say = (text) => {
    if (readout && text !== lastText) readout.textContent = text;
    lastText = text;
  };
  const userText = (ln, phase) => {
    if (!ln) return readoutOf(-1);
    if (!ln.route.stop) return phase === "set" || phase === "dwell" ? "allowed · placed" : "allowed · moving";
    return phase === "lift" || phase === "travel" ? "forbidden · moving" : "forbidden · stopped";
  };

  function start(move, viaTour) {
    line = timeline(move);
    t = 0;
    fromTour = viaTour;
    if (line.route.stop && line.route.stop.id !== lit) {
      lit = line.route.stop.id;
      for (const s of nodes.switches) {
        for (const g of [s.lever, s.flag]) {
          if (!g) continue;
          const on = s.sw.id === lit;
          if (on) g.setAttribute("data-lit", "");
          else g.removeAttribute("data-lit");
          g.lastElementChild.setAttribute("data-tone", on ? "hi" : "mid");
        }
      }
    }
  }

  function draw() {
    const [x, y, z] = pose;
    const dx = x - RX;
    const dy = y - RY;
    nodes.head && nodes.head.setAttribute("transform", translateAlong(P, [dx, dy, z - RZ]));
    nodes.shadow && nodes.shadow.setAttribute("transform", translateAlong(P, [dx, dy, 0]));
    nodes.slider && nodes.slider.setAttribute("transform", translateAlong(P, [dx, dy, 0]));
    nodes.carriage && nodes.carriage.setAttribute("transform", translateAlong(P, [dx, 0, 0]));
    nodes.cap && nodes.cap.setAttribute("transform", translateAlong(P, [dx, 0, 0]));
    setSolid(nodes.beamBack, slabOf({ x: x - 4, y: B.from, w: 8, d: y - B.slide - B.from, r: 0.8 }, B.z, B.top - B.z, P, 2, 0.4));
    setSolid(nodes.beamFront, slabOf({ x: x - 4, y: y + B.slide, w: 8, d: B.to - y - B.slide, r: 0.8 }, B.z, B.top - B.z, P, 2, 0.4));
    for (const s of nodes.switches) {
      if (Math.abs(s.a - s.shown) < 1e-4) continue;
      s.shown = s.a;
      const f = flagSolids(s.sw, s.a, PIVOT_Z, P);
      setSolid(s.lever, f.lever);
      setSolid(s.flag, f.plate);
    }
    // the head and the switches re-sort by depth as the head moves among them
    const items = [...nodes.switches.map((s) => ({ g: s.g, key: depthOf([s.sw.at[0], s.sw.at[1], 0], P) })), { g: nodes.head, key: depthOf([x, y, 0], P) }].filter((i) => i.g);
    items.sort((a, b) => a.key - b.key);
    const next = items.map((i) => i.g.getAttribute("data-part")).join(",");
    if (next !== order && nodes.cross) {
      order = next;
      const frag = document.createDocumentFragment();
      for (const i of items) frag.appendChild(i.g);
      nodes.cross.appendChild(frag);
    }
    if (touring || fromTour) say(line ? readoutOf(tourIndex, tag) : readoutOf(-1));
    else say(userText(line, tag));
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (!line) {
      if (touring) {
        tourWait -= dt;
        if (tourWait <= 0) {
          let i = tourIndex;
          for (let n = 0; n < TOUR.length; n++) {
            i = (i + 1) % TOUR.length;
            if (TOUR[i][0] === bay) break;
          }
          tourIndex = i;
          start(TOUR[i], true);
          tourWait = 0.25;
        }
      } else if (want && want !== bay) {
        start([bay, want], false);
        want = null;
      }
    }
    if (line) {
      t += dt;
      const p = poseAt(line, t);
      pose = p.pose;
      tag = p.tag;
      if (t >= line.total) {
        bay = line.ends;
        line = null;
        tag = "rest";
      }
    }
    let moving = !!line;
    for (const s of nodes.switches) {
      const geo = pushOn(s.sw, pose);
      s.v += (-260 * s.a - 9 * s.v) * dt;
      s.a += s.v * dt;
      if (geo !== 0 && (geo > 0 ? s.a < geo : s.a > geo)) {
        s.a = geo;
        s.v = 0;
      }
      if (geo === 0 && Math.abs(s.a) < 1e-4 && Math.abs(s.v) < 1e-3) {
        s.a = 0;
        s.v = 0;
      }
      if (s.a !== 0 || s.v !== 0) moving = true;
    }
    draw();
    const busy = moving || touring || (want && want !== bay);
    frame = visible && busy ? requestAnimationFrame(tick) : 0;
  }

  const run = () => {
    if (!frame && visible && !still.matches) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(root);

  const bayAt = (event) => {
    const box = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const sx = ((event.clientX - box.left) / box.width) * vb.width;
    const sy = ((event.clientY - box.top) / box.height) * vb.height;
    let best = null;
    let dist = Infinity;
    for (const [name, [bx, by]] of Object.entries(BAYS)) {
      const c = P.origin;
      const a = ((P.azimuth ?? 45) * Math.PI) / 180;
      const e = ((P.elevation ?? 30) * Math.PI) / 180;
      const kk = P.scale * Math.sqrt(1.6);
      const px = c[0] + (bx * Math.sin(a) - by * Math.cos(a)) * kk;
      const py = c[1] + ((bx * Math.cos(a) + by * Math.sin(a)) * Math.sin(e) - PAD_TOP * Math.cos(e)) * kk;
      const d = Math.hypot(px - sx, py - sy);
      if (d < dist) {
        dist = d;
        best = name;
      }
    }
    return best;
  };
  const takeOver = () => {
    touring = false;
    clearTimeout(resume);
    if (mode === "tour" && !still.matches)
      resume = setTimeout(() => {
        touring = true;
        tourWait = 0.6;
        run();
      }, 3600);
  };
  const onMove = (event) => {
    if (mode !== "tour" || still.matches) return;
    takeOver();
    want = bayAt(event);
    run();
  };
  const onEnter = () => {
    if (mode !== "hover" || still.matches || line) return;
    start(HOVER_MOVE, false);
    run();
  };
  const GRID = [["BL", "BM", "BR"], ["FL", "FM", "FR"]];
  const onKey = (event) => {
    if (still.matches) return;
    const row = GRID.findIndex((r) => r.includes(want || bay));
    const col = GRID[row].indexOf(want || bay);
    let next = null;
    if (event.key === "ArrowRight") next = GRID[row][Math.min(2, col + 1)];
    if (event.key === "ArrowLeft") next = GRID[row][Math.max(0, col - 1)];
    if (event.key === "ArrowDown") next = GRID[1][col];
    if (event.key === "ArrowUp") next = GRID[0][col];
    if (event.key === "Home") next = HOME;
    if (!next) return;
    event.preventDefault();
    takeOver();
    want = next;
    run();
  };
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerenter", onEnter);
  root.addEventListener("keydown", onKey);
  draw();
  say(readoutOf(-1));

  return {
    destroy() {
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resume);
      io.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("keydown", onKey);
    },
  };
}
