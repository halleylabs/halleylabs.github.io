import { translateAlong, iso, pathOf } from "../../vendor/anatomy/kit/iso-kit.mjs";

const DATA = /*DATA*/;

/*MODEL*/

function springPaths(P, top, { at, r, turns, up }) {
  const front = [];
  const back = [];
  const steps = Math.round(turns * 24);
  const view = [Math.cos((P.azimuth ?? 45) * Math.PI / 180), Math.sin((P.azimuth ?? 45) * Math.PI / 180)];
  let run = null;
  let side = null;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * turns * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const z = top + (up - top) * (i / steps);
    const point = iso([at[0] + r * c, at[1] + r * s, z], P);
    const facing = c * view[0] + s * view[1] >= 0 ? "front" : "back";
    if (facing !== side) {
      if (run) run.push(point);
      run = run ? [run[run.length - 1]] : [];
      (facing === "front" ? front : back).push(run);
      side = facing;
    }
    run.push(point);
  }
  const join = (runs) => runs.filter((list) => list.length > 1).map((list) => pathOf(list)).join("");
  return { front: join(front), back: join(back) };
}

export function mount(root, { mode = "hover" } = {}) {
  const svg = root && root.querySelector("svg");
  if (!svg) return { destroy() {} };
  const P = DATA.P;
  const all = (name) => [...svg.querySelectorAll(`[data-part="${name}"]`)];
  const parts = {
    carriage: all("carriage"),
    hole: all("hole-clip"),
    key: all("key"),
    finger: all("finger"),
    pin: all("pin"),
    back: all("spring-back"),
    front: all("spring-front"),
  };
  const plate = root.closest(".iso-plate");
  const readout = plate ? plate.querySelector("[data-readout]") : null;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const glide = (s, target, dt, seconds) => {
    const w = 1 / seconds;
    for (let i = 0; i < 4; i++) {
      s.v += (w * w * (target - s.x) - 2 * w * s.v) * (dt / 4);
      s.x += s.v * (dt / 4);
    }
    if (Math.abs(target - s.x) < 1e-3 && Math.abs(s.v) < 1e-3) { s.x = target; s.v = 0; }
  };
  const shift = { x: 0, v: 0 };
  const drop = { x: 0, v: 0 };
  const press = { x: 0, v: 0 };
  let active = mode === "tour";
  let clock = 0;
  let user = null;
  let resume = 0;
  let frame = 0;
  let last = 0;
  let visible = false;
  let said = "";
  let phase = "";

  function draw() {
    const slide = translateAlong(P, [shift.x, 0, 0]);
    for (const node of parts.carriage) node.setAttribute("transform", slide);
    for (const node of parts.hole) node.setAttribute("transform", slide);
    const fall = translateAlong(P, [0, 0, -drop.x]);
    for (const node of parts.pin) node.setAttribute("transform", fall);
    const stroke = press.x * DATA.stroke;
    for (const node of parts.finger) node.setAttribute("transform", translateAlong(P, [0, 0, -stroke]));
    const padBottom = DATA.padRest - stroke;
    const sink = seatedAt(shift.x) ? Math.min(KEY_TRAVEL, Math.max(0, DATA.keyTop - padBottom)) : 0;
    for (const node of parts.key) node.setAttribute("transform", translateAlong(P, [0, 0, -sink]));
    const coil = springPaths(P, DATA.spring.low - drop.x, DATA.spring);
    for (const node of parts.back) node.setAttribute("d", coil.back);
    for (const node of parts.front) node.setAttribute("d", coil.front);
    const text = readoutOf({ shift: shift.x, drop: drop.x, press: press.x });
    if (readout && text !== said) { readout.textContent = text; said = text; }
    const word = text.replace(/-?[\d.]+ px/, "").trim();
    if (word !== phase) { phase = word; root.setAttribute("aria-valuetext", text); }
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const running = active || user !== null;
    if (running) clock += dt;
    const t = clock % CYCLE;
    let shiftTarget = 0;
    if (user !== null) shiftTarget = user;
    else if (active) shiftTarget = tourShift(clock);
    const pinTarget = running ? pinWants(t) * SEAT_DROP : 0;
    const fire = running ? fireWants(t) : 0;
    if (clearOf(drop.x)) glide(shift, shiftTarget, dt, 0.15);
    else shift.v = 0;
    glide(drop, pinTarget, dt, 0.11);
    const stop = stopOf(shift.x);
    if (drop.x > stop) { drop.x = stop; drop.v = 0; }
    glide(press, fire && tripped(drop.x) ? 1 : 0, dt, 0.055);
    draw();
    const settled = !running && shift.x === shiftTarget && drop.x === 0 && press.x === 0 && shift.v === 0;
    frame = visible && !settled ? requestAnimationFrame(tick) : 0;
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
  const take = (value) => {
    user = Math.min(PITCH, Math.max(0, value));
    clearTimeout(resume);
    resume = setTimeout(() => { user = null; run(); }, 3600);
    run();
  };
  if (mode === "hover") {
    on("pointerenter", () => { if (!active) { active = true; clock = 0; } run(); });
    on("pointerleave", () => { active = false; run(); });
  } else {
    on("pointermove", (event) => {
      const box = svg.getBoundingClientRect();
      const share = Math.min(1, Math.max(0, ((event.clientX - box.left) / box.width - 0.3) / 0.4));
      take(share * PITCH);
    });
    on("keydown", (event) => {
      const from = user === null ? shift.x : user;
      let to = null;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") to = from + 3;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = from - 3;
      if (event.key === "Home") to = 0;
      if (event.key === "End") to = PITCH;
      if (to === null) return;
      event.preventDefault();
      take(Math.round(to / 3) * 3);
    });
  }
  const onStill = () => { if (still.matches) { shift.x = drop.x = press.x = 0; shift.v = drop.v = press.v = 0; draw(); } else run(); };
  still.addEventListener("change", onStill);
  draw();
  run();

  return {
    destroy() {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resume);
      still.removeEventListener("change", onStill);
      for (const [type, fn] of listeners) root.removeEventListener(type, fn);
    },
  };
}
