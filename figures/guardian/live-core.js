// Live behaviour, inlined into guardian.live.js after the model, box and draw sources.
// Needs: DATA, P, the model constants, armSolid, tokenPaths, tokenDots, cleatsPath, and the
// kit's slabOf, iso, translateAlong, depthOf.

function setSolid(g, paths) {
  if (!g) return;
  const n = g.children;
  if (!paths) {
    for (let i = 0; i < 9; i++) n[i].setAttribute("d", "");
    return;
  }
  n[0].setAttribute("d", paths.fill);
  for (let i = 0; i < 4; i++) n[1 + i].setAttribute("d", paths.shades[i] || "");
  n[5].setAttribute("d", paths.top);
  n[6].setAttribute("d", paths.crease || "");
  n[7].setAttribute("d", paths.bevel || "");
  n[8].setAttribute("d", paths.outline);
}

const ease = (u) => {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
};

export function mount(root, { mode = "hover" } = {}) {
  const svg = root.querySelector("svg");
  const q = (name) => svg.querySelector(`[data-part="${name}"]`);
  const plate = root.closest(".iso-plate");
  const readout = (plate && plate.querySelector("[data-readout]")) || root.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const SIZE = TOKEN;
  const MOUTHS = [MOUTH_IN, MOUTH_OUT];
  const nodes = { cross: q("cross"), arm: q("arm"), ram: q("ram"), pad: q("pad"), probes: q("probes"), cleats: q("cleats") };
  const tokens = REST_TOKENS.map((x, i) => {
    const g = q(`token-${i}`);
    return { x, y: 0, z: BELT_TOP, alpha: 1, state: i === 0 ? "held" : "belt", age: 0, g, solid: g && g.firstElementChild, dots: g ? [...g.querySelectorAll("circle")] : [] };
  });

  let queue = [];
  let step = null;
  let st = 0;
  let moved = 0;
  let belt = 0;
  let verdictAt = 0;
  let list = mode === "tour" ? TOUR : HOVER;
  let touring = mode === "tour" && !still.matches;
  let tourWait = 1.4;
  let armA = 0;
  let armTarget = 0;
  let padY = DATA.PAD_REST;
  let probe = 0;
  let frame = 0;
  let last = 0;
  let visible = false;
  let order = "";
  let text = REST_TEXT;
  let shown = "";
  let resume = 0;

  const say = (value) => {
    text = value;
    if (readout && value !== shown) readout.textContent = value;
    shown = value;
  };

  function stepsFor(v) {
    const out = [];
    if (tokens.some((t) => t.state === "held")) out.push({ kind: "push", dur: T.push }, { kind: "retract", dur: T.retract });
    out.push({ kind: "index", to: "inspect" });
    out.push({ kind: "read", dur: T.probeDown + T.read + T.probeUp, verdict: v });
    if (v === "allow") out.push({ kind: "lift", dur: T.armUp });
    else out.push({ kind: "dwell", dur: 0.55 }, { kind: "index", to: "stop" });
    out.push({ kind: "dwell", dur: T.settle });
    return out;
  }
  const nextCycle = () => {
    const v = list[verdictAt % list.length];
    verdictAt++;
    queue.push(...stepsFor(v));
  };

  function begin(s) {
    st = 0;
    moved = 0;
    if (s.kind === "index") {
      const onBelt = tokens.filter((t) => t.state === "belt");
      let d = 0;
      if (s.to === "inspect") {
        const next = onBelt.filter((t) => t.x < INSPECT - 0.01).sort((a, b) => b.x - a.x)[0];
        d = next ? INSPECT - next.x : 0;
      } else {
        d = STOP - INSPECT;
        s.token = onBelt.find((t) => Math.abs(t.x - INSPECT) < 0.05);
      }
      s.dist = d;
      s.dur = moveTime(d);
    }
    if (s.kind === "read") say(READING_TEXT);
  }
  function finish(s) {
    if (s.kind === "read") say(verdictText(s.verdict));
    if (s.kind === "lift") {
      const t = tokens.find((k) => k.state === "belt" && Math.abs(k.x - INSPECT) < 0.05);
      if (t) t.state = "belt";
    }
    if (s.kind === "index" && s.to === "stop" && s.token) {
      s.token.x = STOP;
      s.token.state = "held";
    }
  }

  function advance(dt) {
    if (!step && queue.length) {
      step = queue.shift();
      begin(step);
    }
    if (!step) return false;
    st += dt;
    const u = Math.min(1, st / step.dur);
    if (step.kind === "index") {
      const want = step.dist * ease(u);
      const delta = want - moved;
      moved = want;
      belt += delta;
      for (const t of tokens) if (t.state === "belt") t.x += delta;
      // the held token's arm: a safe token passes under it, then it comes down behind it
      const passing = tokens.some((t) => t.state === "belt" && t.x + SIZE.len / 2 > GATE - ARM_HALF - 0.5 && t.x - SIZE.len / 2 < GATE + ARM_HALF + 0.8);
      if (armTarget > 0 && !passing && tokens.some((t) => t.state === "belt" && t.x - SIZE.len / 2 >= GATE + ARM_HALF + 0.8)) armTarget = 0;
    } else if (step.kind === "read") {
      const a = T.probeDown;
      const b = a + T.read;
      probe = st < a ? ease(st / a) : st < b ? 1 : 1 - ease((st - b) / T.probeUp);
    } else if (step.kind === "lift") {
      armTarget = DATA.ARM_UP;
    } else if (step.kind === "push") {
      padY = DATA.PAD_REST + (DATA.PAD_MAX - DATA.PAD_REST) * ease(u);
      const held = tokens.find((t) => t.state === "held");
      if (held) {
        held.y = Math.max(0, padY + 2 + SIZE.wide / 2);
        if (u >= 1) {
          held.state = "drop";
          held.age = 0;
        }
      }
    } else if (step.kind === "retract") {
      padY = DATA.PAD_MAX + (DATA.PAD_REST - DATA.PAD_MAX) * ease(u);
    }
    if (st >= step.dur) {
      if (step.kind === "read") probe = 0;
      finish(step);
      step = null;
    }
    return true;
  }

  function tokensTick(dt) {
    let busy = false;
    for (const t of tokens) {
      if (t.state === "drop") {
        busy = true;
        t.age += dt;
        const f = Math.min(1, (t.age / 0.42) ** 2);
        t.z = BELT_TOP - (BELT_TOP - BIN_FLOOR) * f;
        if (t.age > 0.42) {
          t.state = "bin";
          t.age = 0;
        }
      } else if (t.state === "bin") {
        busy = true;
        t.age += dt;
        t.alpha = 1 - ease((t.age - 0.5) / 1.1);
        if (t.age > 1.6) t.state = "gone";
      }
    }
    for (const t of tokens) {
      const out = t.state === "belt" && t.x - SIZE.len / 2 > MOUTH_OUT + 1;
      if (t.state === "gone" || out) {
        const onBelt = tokens.filter((k) => k !== t && (k.state === "belt" || k.state === "held"));
        const min = Math.min(...onBelt.map((k) => k.x));
        t.x = min - SPACING;
        t.y = 0;
        t.z = BELT_TOP;
        t.alpha = 1;
        t.state = "belt";
      }
    }
    return busy;
  }

  function draw() {
    for (const t of tokens) {
      if (!t.g) continue;
      setSolid(t.solid, tokenPaths(t, SIZE, MOUTHS, slabOf, P));
      const dots = tokenDots(t, SIZE, PROBES, MOUTHS, iso, P);
      t.dots.forEach((c, i) => {
        const p = dots[i];
        if (p) {
          c.setAttribute("cx", p[0].toFixed(1));
          c.setAttribute("cy", p[1].toFixed(1));
          c.style.display = "";
        } else c.style.display = "none";
      });
      t.g.style.opacity = t.alpha < 1 ? t.alpha.toFixed(3) : "";
    }
    setSolid(nodes.arm && nodes.arm.firstElementChild, armSolid(DATA.PIVOT, DATA.ARM_LEN, DATA.ARM_HALF, armA, P));
    setSolid(nodes.ram, slabOf({ x: STOP - 1.5, y: DATA.RAM_FROM, w: 3, d: padY - DATA.RAM_FROM, r: 0.5 }, 18.5, 3, P, 2, 0.2));
    setSolid(nodes.pad, slabOf({ x: STOP - 7, y: padY, w: 14, d: 2, r: 0.5 }, 17.2, 5.6, P, 2, 0.3));
    if (nodes.probes) nodes.probes.setAttribute("transform", probe ? translateAlong(P, [0, 0, -DATA.PROBE_DROP * probe]) : "");
    if (nodes.cleats) nodes.cleats.setAttribute("d", cleatsPath(belt, 8, MOUTH_IN, MOUTH_OUT, DATA.BH, BELT_TOP, iso, P));
    // tokens and the arm re-sort by depth
    // a token beside the arm on its upstream side stays behind it until it is past the arm's end
    const armKey = depthOf([GATE, -2, 20], P);
    const armEnd = DATA.PIVOT[1] + DATA.ARM_LEN;
    const keyOf = (t) => {
      const d = depthOf([t.x, t.y, t.z], P);
      return t.x < GATE && t.y - SIZE.wide / 2 < armEnd ? Math.min(d, armKey - 0.01) : d;
    };
    const items = [...tokens.filter((t) => t.g).map((t) => ({ g: t.g, key: keyOf(t) })), { g: nodes.arm, key: armKey }].filter((i) => i.g);
    items.sort((a, b) => a.key - b.key);
    const next = items.map((i) => i.g.getAttribute("data-part")).join(",");
    if (next !== order && nodes.cross) {
      order = next;
      const frag = document.createDocumentFragment();
      for (const i of items) frag.appendChild(i.g);
      nodes.cross.appendChild(frag);
    }
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (!step && !queue.length && touring) {
      tourWait -= dt;
      if (tourWait <= 0) {
        nextCycle();
        tourWait = 0.3;
      }
    }
    const stepping = advance(dt);
    const dropping = tokensTick(dt);
    const before = armA;
    armA += (armTarget - armA) * (1 - Math.exp(-dt / 0.2));
    if (Math.abs(armTarget - armA) < 1e-4) armA = armTarget;
    draw();
    if (mode === "hover" && !stepping && !queue.length && !dropping) say(REST_TEXT);
    const busy = stepping || dropping || armA !== before || touring || queue.length > 0;
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

  const idle = () => !step && !queue.length;
  const send = () => {
    if (still.matches) return;
    if (mode === "tour") {
      touring = false;
      clearTimeout(resume);
      resume = setTimeout(() => {
        touring = true;
        tourWait = 0.4;
        run();
      }, 3600);
    }
    if (idle()) nextCycle();
    run();
  };
  const onEnter = () => {
    if (mode !== "hover" || still.matches || !idle()) return;
    list = HOVER;
    verdictAt = 0;
    nextCycle();
    nextCycle();
    run();
  };
  const onDown = () => {
    if (mode === "tour") send();
  };
  const onKey = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    send();
  };
  root.addEventListener("pointerenter", onEnter);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("keydown", onKey);
  draw();
  say(REST_TEXT);

  return {
    destroy() {
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resume);
      io.disconnect();
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("keydown", onKey);
    },
  };
}
