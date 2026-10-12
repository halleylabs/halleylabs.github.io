import { translateAlong, iso, extrude, onTop, towardViewer } from "../../vendor/anatomy/kit/iso-kit.mjs";

const G = {"P":{"origin":[238.96838858045254,182.64452730006693],"scale":1.1533766302365729,"azimuth":45,"elevation":30},"S":[-30,-38],"L1":64,"L2":56,"L1Z":[48,57],"L2Z":[57,65],"hand":-1,"W":[60,5],"docks":[[-84,42],[-58,42],[-32,42],[-6,42]],"cradleTop":9,"workTop":16,"safe":44,"restZ":33,"headH":[10,12,14,16],"headR":[7,7,7,8],"heads":[0,0,0,0],"link1R":12.5,"link1Rb":10.5,"link2R":10.5,"link2Rb":9.5,"capR":8,"capH":3,"elbowR":10.5,"elbowTop":77,"quillR":9.5,"masterR":7.4,"shaftTop":66,"column":{"r":21},"stand":{"seg":[[-92,42],[2,42]],"r":10,"top":9},"vise":{"seg":[[47,5],[94,5]],"r":14,"top":16},"dotAlong":[20,18],"dotAcross":[6,5]};

// UnClaude: the truth behind the figure.
// From www/src/data/projects/unclaude.json ("Each request is scored ... then sent to the cheapest
// model tier that can handle it") and the router it describes (src/unclaude/routing/scorer.py,
// RequestTier: simple, medium, complex, reasoning). The repo publishes no benchmark numbers,
// so the figure shows no savings figure: only which head each job gets.

const TIERS = ["simple", "medium", "complex", "reasoning"];
// One tool head per tier, smallest (cheapest) to largest. Any model fits the same coupling,
// a local one included.
const HEADS = ["small model", "mid model", "large model", "reasoning model"];

// The cheapest head that can handle the job is the one for its tier.
const headFor = (tier) => tier;

// The tour: a run of jobs of mixed difficulty, so the arm swaps heads between most of them.
const TOUR_JOBS = [2, 0, 3, 1];
const REST_HEAD = 1;

function readoutOf({ phase, tier, head }) {
  const job = tier === null ? "" : `${TIERS[tier]} job · `;
  if (phase === "return") return `${job}returning the ${HEADS[head]}`;
  if (phase === "fetch") return `${job}fetching the ${HEADS[head]}`;
  if (phase === "work") return `${job}${HEADS[head]} at work`;
  if (phase === "park") return `${HEADS[head]} mounted`;
  return `${job}routing`;
}


// UnClaude: arm kinematics and depth order, shared by the build and the live module.

// Inverse kinematics of a two-link SCARA arm: shoulder at S, links L1 and L2, elbow side `hand`.
function reach([x, y], S, L1, L2, hand) {
  const dx = x - S[0];
  const dy = y - S[1];
  const d = Math.min(L1 + L2 - 0.01, Math.max(Math.abs(L1 - L2) + 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const alpha = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const a1 = base + hand * alpha;
  const E = [S[0] + L1 * Math.cos(a1), S[1] + L1 * Math.sin(a1)];
  const a2 = Math.atan2(y - E[1], x - E[0]);
  return { a1, bend: wrap(a2 - a1) };
}

function wrap(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Forward kinematics: elbow E and quill Q from the joint angles.
function joints({ a1, bend }, S, L1, L2) {
  const E = [S[0] + L1 * Math.cos(a1), S[1] + L1 * Math.sin(a1)];
  const a2 = a1 + bend;
  return { E, Q: [E[0] + L2 * Math.cos(a2), E[1] + L2 * Math.sin(a2)], a2 };
}

// A stadium (rounded link) between two plan points, as a floor ring for extrude.
function stadium(a, b, ra, rb, steps = 14) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const ring = [];
  for (let i = 0; i <= steps; i++) {
    const t = ang - Math.PI / 2 + (i / steps) * Math.PI;
    ring.push([b[0] + rb * Math.cos(t), b[1] + rb * Math.sin(t)]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = ang + Math.PI / 2 + (i / steps) * Math.PI;
    ring.push([a[0] + ra * Math.cos(t), a[1] + ra * Math.sin(t)]);
  }
  return ring;
}

function closest(segA, segB) {
  let best = Infinity;
  let pair = [segA[0], segB[0]];
  for (let i = 0; i <= 8; i++) {
    const p = [segA[0][0] + ((segA[1][0] - segA[0][0]) * i) / 8, segA[0][1] + ((segA[1][1] - segA[0][1]) * i) / 8];
    for (let j = 0; j <= 8; j++) {
      const q = [segB[0][0] + ((segB[1][0] - segB[0][0]) * j) / 8, segB[0][1] + ((segB[1][1] - segB[0][1]) * j) / 8];
      const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
      if (d < best) { best = d; pair = [p, q]; }
    }
  }
  return pair;
}

// Screen box of an item: its plan segment grown by r, from z0 to z1.
function boxOf(item, project) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of item.seg) {
    for (const [ox, oy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      for (const z of [item.z0, item.z1]) {
        const [sx, sy] = project([x + ox * item.r, y + oy * item.r, z]);
        x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
      }
    }
  }
  return [x0, y0, x1, y1];
}

// Painter's order for parts that stand apart in plan or in height: a part wholly above another is
// drawn after it; otherwise the one whose nearest point lies further toward the viewer is drawn after.
function orderOf(items, project, view) {
  const n = items.length;
  const boxes = items.map((item) => boxOf(item, project));
  const after = Array.from({ length: n }, () => []);
  const need = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = boxes[i], b = boxes[j];
      if (a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]) continue;
      const A = items[i], B = items[j];
      let front;
      if (A.z0 >= B.z1 - 0.01) front = i;
      else if (B.z0 >= A.z1 - 0.01) front = j;
      else {
        const [p, q] = closest(A.seg, B.seg);
        const toward = (q[0] - p[0]) * view[0] + (q[1] - p[1]) * view[1];
        front = toward > 0 ? j : i;
      }
      const back = front === i ? j : i;
      after[back].push(front);
      need[front]++;
    }
  }
  const order = [];
  const done = new Array(n).fill(false);
  for (let round = 0; round < n; round++) {
    let pick = -1;
    for (let i = 0; i < n; i++) if (!done[i] && need[i] === 0) { pick = i; break; }
    if (pick < 0) for (let i = 0; i < n; i++) if (!done[i]) { pick = i; break; }
    done[pick] = true;
    order.push(pick);
    for (const next of after[pick]) need[next]--;
  }
  return order;
}

// The sortable parts of the bench for one pose. heads: [{ at: [x, y], bottom }] per head.
function itemsOf(pose, heads, G) {
  const { E, Q } = joints(pose, G.S, G.L1, G.L2);
  const list = [
    { name: "stand", seg: G.stand.seg, r: G.stand.r, z0: 0, z1: G.stand.top },
    { name: "vise", seg: G.vise.seg, r: G.vise.r, z0: 0, z1: G.vise.top },
    { name: "column", seg: [G.S, G.S], r: G.column.r, z0: 0, z1: G.L1Z[0] },
    { name: "link1", seg: [G.S, E], r: G.link1R, z0: G.L1Z[0], z1: G.L1Z[1] },
    { name: "cap", seg: [G.S, G.S], r: G.capR, z0: G.L1Z[1], z1: G.L1Z[1] + G.capH },
    { name: "link2", seg: [E, Q], r: G.link2R, z0: G.L2Z[0], z1: G.L2Z[1] },
    { name: "elbow", seg: [E, E], r: G.elbowR, z0: G.L2Z[1], z1: G.elbowTop },
    { name: "quill-top", seg: [Q, Q], r: G.quillR, z0: G.L2Z[1], z1: pose.z + G.shaftTop },
    { name: "quill-low", seg: [Q, Q], r: G.masterR, z0: pose.z, z1: G.L2Z[0] },
  ];
  heads.forEach((head, index) => list.push({ name: `head-${index}`, seg: [head.at, head.at], r: G.headR[index], z0: head.bottom, z1: head.bottom + G.headH[index] }));
  return { list, E, Q };
}


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
