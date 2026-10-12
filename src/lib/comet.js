// A comet with real behaviour, mountable in any canvas. The Sun follows the pointer (or drifts on
// its own when nobody touches it). Light on the nucleus goes as 1/r^2; dust leaves the sunward side
// and is pushed back into a curved tail, ions are blown straight away from the Sun.
export function mountComet(canvas, opts = {}) {
  const o = Object.assign({ count: 26000, home: [0.5, 0.02], sunOffset: [0.34, -0.2], scale: 1, interactive: true, seed: 1234567 }, opts);
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;
  const phone = matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  // the comet is all soft light, so it loses nothing at a lower resolution on small screens
  const DPR = Math.min(devicePixelRatio || 1, phone ? 1 : 1.5);
  const N = Math.round(o.count * (phone ? 0.35 : 1));
  const HAZE = phone ? 4 : 2; // the wide glow pass draws every HAZE-th particle, that much brighter
  let rng = o.seed;
  const rand = () => ((rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gauss = () => { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * rand()); };
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N * 2), kind = new Float32Array(N);
  const packed = new Float32Array(N * 5);
  let head = 0, W = 1, H = 1, aspect = 1, t = 0, light = 0, running = false, frame = 0, last = 0, boost = 0;
  const nucleus = { x: 0, y: 0, vx: 0, vy: 0 };
  const sun = { x: 0, y: 0, tx: 0, ty: 0, lastMove: -99 };

  const vs = `#version 300 es
in vec2 a_pos; in vec2 a_life; in float a_kind;
uniform vec2 u_scale; uniform float u_px; uniform float u_size;
out float v_a; out float v_k; out float v_t;
void main() {
  float t = clamp(a_life.x / a_life.y, 0.0, 1.0); v_t = t; v_k = a_kind;
  v_a = a_life.y > 0.0 ? smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.55, 1.0, t)) : 0.0;
  gl_Position = vec4(a_pos.xy * u_scale, 0.0, 1.0);
  float size = a_kind > 0.5 ? mix(1.4, 2.6, t) : mix(2.0, 6.0, sqrt(t));
  gl_PointSize = size * u_px * u_size;
}`;
  const fs = `#version 300 es
precision mediump float;
in float v_a; in float v_k; in float v_t;
uniform float u_light; uniform float u_gain; uniform float u_sharp;
out vec4 col;
void main() {
  vec2 c = gl_PointCoord - 0.5; float d = dot(c, c) * 4.0;
  float soft = exp(-d * u_sharp) * (1.0 - smoothstep(0.7, 1.0, d));
  vec3 hot = vec3(1.0, 0.93, 0.86), body = vec3(0.86, 0.26, 0.13), deep = vec3(0.55, 0.12, 0.07);
  vec3 k = v_k > 0.5 ? mix(vec3(1.0, 0.55, 0.42), body, v_t) : mix(mix(hot, body, smoothstep(0.0, 0.35, v_t)), deep, smoothstep(0.35, 1.0, v_t));
  float a = soft * v_a * (v_k > 0.5 ? 0.22 : 0.13) * (0.35 + 0.65 * u_light) * u_gain;
  col = vec4(k * a, a);
}`;
  const qvs = `#version 300 es
in vec2 a; out vec2 v; void main() { v = a; gl_Position = vec4(a, 0.0, 1.0); }`;
  const qfs = `#version 300 es
precision highp float;
in vec2 v; uniform vec2 u_n; uniform vec2 u_sun; uniform float u_light; uniform vec2 u_scale; uniform vec3 u_bg; uniform float u_grain;
out vec4 col;
void main() {
  vec2 p = v / u_scale;
  float d = length(p - u_n);
  float coma = exp(-d * d / (0.002 + 0.02 * u_light)) * (0.22 + 1.1 * u_light);
  float halo = exp(-d / (0.05 + 0.22 * u_light)) * (0.05 + 0.32 * u_light);
  float core = exp(-d * d / 0.00008) * (0.7 + 1.6 * u_light);
  vec3 c = u_bg + vec3(1.0, 0.95, 0.9) * core + vec3(0.95, 0.5, 0.32) * coma + vec3(0.78, 0.22, 0.12) * halo;
  float s = length(p - u_sun);
  c += vec3(0.14, 0.1, 0.08) * exp(-s * s / 0.05) * 0.4;
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * u_grain * (0.6 + 2.0 * max(c.r, max(c.g, c.b)));
  col = vec4(c + n / 255.0, 1.0);
}`;
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const program = (a, b) => { const p = gl.createProgram(); gl.attachShader(p, shader(gl.VERTEX_SHADER, a)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, b)); gl.linkProgram(p); return p; };
  const P = program(vs, fs), QP = program(qvs, qfs);
  const bP = gl.createBuffer(), bQ = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bQ); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, bP); gl.bufferData(gl.ARRAY_BUFFER, packed.byteLength, gl.DYNAMIC_DRAW);
  const uq = {}, up = {};
  for (const n of ["u_n", "u_sun", "u_light", "u_scale", "u_bg", "u_grain"]) uq[n] = gl.getUniformLocation(QP, n);
  for (const n of ["u_scale", "u_px", "u_light", "u_size", "u_gain", "u_sharp"]) up[n] = gl.getUniformLocation(P, n);
  const qa = gl.getAttribLocation(QP, "a");
  const loc = { pos: gl.getAttribLocation(P, "a_pos"), life: gl.getAttribLocation(P, "a_life"), kind: gl.getAttribLocation(P, "a_kind") };
  // two vertex arrays over the same buffer: every particle, and every HAZE-th particle for the glow
  const vaoFor = (stride) => {
    const v = gl.createVertexArray(); gl.bindVertexArray(v); gl.bindBuffer(gl.ARRAY_BUFFER, bP);
    gl.enableVertexAttribArray(loc.pos); gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(loc.life); gl.vertexAttribPointer(loc.life, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(loc.kind); gl.vertexAttribPointer(loc.kind, 1, gl.FLOAT, false, stride, 16);
    return v;
  };
  const vAll = vaoFor(20), vHaze = vaoFor(20 * HAZE);
  const vQuad = gl.createVertexArray(); gl.bindVertexArray(vQuad); gl.bindBuffer(gl.ARRAY_BUFFER, bQ);
  gl.enableVertexAttribArray(qa); gl.vertexAttribPointer(qa, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const bg = (o.background || [0.047, 0.043, 0.04]);

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * DPR)); H = Math.max(1, Math.round(r.height * DPR));
    canvas.width = W; canvas.height = H; aspect = W / H; gl.viewport(0, 0, W, H);
  }
  const lightAt = (r) => Math.min(1, ((0.3 * o.scale) / Math.max(r, 0.02)) ** 2);
  function emit(dt) {
    let count = (1600 + 14000 * light) * (N / 26000) * dt;
    const dx = sun.x - nucleus.x, dy = sun.y - nucleus.y, r = Math.hypot(dx, dy) || 1, sx = dx / r, sy = dy / r;
    while (count > 0) {
      if (count < 1 && rand() > count) break;
      count -= 1;
      const i = head; head = (head + 1) % N;
      const ion = rand() < 0.28; kind[i] = ion ? 1 : 0;
      const ang = Math.atan2(sy, sx) + gauss() * (ion ? 1.4 : 0.75);
      const sp = (ion ? 0.004 + 0.014 * rand() : (0.02 + 0.06 * light) * (0.4 + rand())) * o.scale;
      pos[i * 3] = nucleus.x + gauss() * 0.002 * o.scale; pos[i * 3 + 1] = nucleus.y + gauss() * 0.002 * o.scale;
      vel[i * 3] = nucleus.vx + Math.cos(ang) * sp; vel[i * 3 + 1] = nucleus.vy + Math.sin(ang) * sp;
      life[i * 2 + 1] = ion ? 3 + rand() * 2 : 8 + rand() * 6;
      const h = rand() * dt, px = pos[i * 3] - sun.x, py = pos[i * 3 + 1] - sun.y, pr2 = px * px + py * py + 0.004, pr = Math.sqrt(pr2);
      const acc = (((ion ? 0.02 : 0.0032 * (0.35 + (i % 9) / 9)) * o.scale * o.scale) / pr2) * 60 + (ion ? 0.005 * 60 * o.scale : 0);
      const ax = (px / pr) * acc, ay = (py / pr) * acc;
      pos[i * 3] += vel[i * 3] * h + 0.5 * ax * h * h; pos[i * 3 + 1] += vel[i * 3 + 1] * h + 0.5 * ay * h * h;
      vel[i * 3] += ax * h; vel[i * 3 + 1] += ay * h; life[i * 2] = h;
    }
  }
  // dt moves the particles; clock moves the Sun and the nucleus (they keep real time while the tail fast-forwards)
  function step(dt, clock = dt) {
    t += clock;
    if (t - sun.lastMove > 4 || !o.interactive) {
      const a = t * 0.14;
      sun.tx = nucleus.x + (o.sunOffset[0] + Math.cos(a) * 0.16) * o.scale;
      sun.ty = nucleus.y + (o.sunOffset[1] + Math.sin(a) * 0.24) * o.scale;
    }
    sun.x += (sun.tx - sun.x) * (1 - Math.exp(-clock / 0.35));
    sun.y += (sun.ty - sun.y) * (1 - Math.exp(-clock / 0.35));
    const hx = aspect * 0.5 * o.home[0], hy = o.home[1];
    const nx = hx + Math.sin(t * 0.07) * 0.03, ny = hy + Math.cos(t * 0.05) * 0.02;
    nucleus.vx = (nx - nucleus.x) * 2; nucleus.vy = (ny - nucleus.y) * 2; nucleus.x = nx; nucleus.y = ny;
    light = lightAt(Math.hypot(sun.x - nucleus.x, sun.y - nucleus.y)) * (1 + boost);
    light = Math.min(1, light);
    boost *= Math.exp(-clock / 0.8);
    emit(dt);
    for (let i = 0; i < N; i++) {
      const L = life[i * 2 + 1]; if (L <= 0) { packed[i * 5 + 3] = 0; continue; }
      const a = (life[i * 2] += dt); if (a > L) { life[i * 2 + 1] = 0; packed[i * 5 + 3] = 0; continue; }
      const k = i * 3, dx = pos[k] - sun.x, dy = pos[k + 1] - sun.y, r2 = dx * dx + dy * dy + 0.004, r = Math.sqrt(r2);
      const push = (kind[i] > 0.5 ? 0.02 * (0.75 + 0.5 * ((i * 0.618034) % 1)) : 0.0032 * (0.35 + (i % 9) / 9)) * o.scale * o.scale;
      const f = push / r2;
      vel[k] += (dx / r) * f * dt * 60; vel[k + 1] += (dy / r) * f * dt * 60;
      if (kind[i] > 0.5) { vel[k] *= 0.985; vel[k + 1] *= 0.985; vel[k] += (dx / r) * 0.005 * o.scale; vel[k + 1] += (dy / r) * 0.005 * o.scale; }
      pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt;
      const j = i * 5; packed[j] = pos[k]; packed[j + 1] = pos[k + 1]; packed[j + 2] = a; packed[j + 3] = L; packed[j + 4] = kind[i];
    }
  }
  function draw() {
    const sx = 1 / (aspect * 0.5), sy = 2;
    gl.disable(gl.BLEND); gl.useProgram(QP); gl.bindVertexArray(vQuad);
    gl.uniform2f(uq.u_n, nucleus.x, nucleus.y); gl.uniform2f(uq.u_sun, sun.x, sun.y); gl.uniform1f(uq.u_light, light);
    gl.uniform2f(uq.u_scale, sx, sy); gl.uniform3f(uq.u_bg, bg[0], bg[1], bg[2]); gl.uniform1f(uq.u_grain, o.grain ?? 0.018);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(P);
    gl.bindBuffer(gl.ARRAY_BUFFER, bP); gl.bufferSubData(gl.ARRAY_BUFFER, 0, packed);
    gl.uniform2f(up.u_scale, sx, sy); gl.uniform1f(up.u_px, DPR * Math.max(0.7, H / 900) * 1.2); gl.uniform1f(up.u_light, light);
    gl.bindVertexArray(vHaze);
    gl.uniform1f(up.u_size, 9.0); gl.uniform1f(up.u_gain, 0.06 * HAZE); gl.uniform1f(up.u_sharp, 2.0); gl.drawArrays(gl.POINTS, 0, Math.floor(N / HAZE));
    gl.bindVertexArray(vAll);
    gl.uniform1f(up.u_size, 1.0); gl.uniform1f(up.u_gain, 0.9); gl.uniform1f(up.u_sharp, 4.0); gl.drawArrays(gl.POINTS, 0, N);
    gl.bindVertexArray(null);
  }
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let born = 0;
  function loop(now) {
    frame = running ? requestAnimationFrame(loop) : 0;
    if (last && now - last < 15) return; // 60 fps is plenty for light this soft, and halves the work on 120 Hz screens
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    // ignition: the first moments run fast, so the tail grows in front of you instead of being precomputed
    if (!born) born = now;
    const age = (now - born) / 1000, fast = age < 2.4 ? 1 + 5 * (1 - age / 2.4) ** 2 : 1;
    if (fast > 1) { const sub = Math.ceil(fast * dt / (1 / 20)); for (let i = 0; i < sub; i++) step((fast * dt) / sub, dt / sub); } else step(dt);
    draw();
  }
  function start() { if (running || still) return; running = true; last = 0; frame = requestAnimationFrame(loop); }
  function stop() { running = false; if (frame) cancelAnimationFrame(frame); frame = 0; }
  resize();
  new ResizeObserver(() => { resize(); if (!running) draw(); }).observe(canvas);
  nucleus.x = aspect * 0.5 * o.home[0]; nucleus.y = o.home[1];
  // start the clock where the old 10 s warm-up left it, with the drifting Sun already in place
  t = 10;
  const a0 = t * 0.14;
  sun.x = sun.tx = nucleus.x + (o.sunOffset[0] + Math.cos(a0) * 0.16) * o.scale;
  sun.y = sun.ty = nucleus.y + (o.sunOffset[1] + Math.sin(a0) * 0.24) * o.scale;
  sun.lastMove = -99;
  // a short warm-up only (about 2 ms); the rest of the tail grows live, fast-forwarded, in the first seconds
  for (let i = 0; i < (o.warm ?? 8); i++) step(1 / 30);
  draw();
  if (o.interactive) {
    (o.pointerTarget || canvas).addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      sun.lastMove = t;
      sun.tx = (((e.clientX - r.left) / r.width) * 2 - 1) * aspect * 0.5;
      sun.ty = -(((e.clientY - r.top) / r.height) * 2 - 1) * 0.5;
    });
  }
  return {
    start, stop, draw,
    flare() { boost = 0.9; },
    screenPos() { const r = canvas.getBoundingClientRect(); return [r.left + ((nucleus.x / (aspect * 0.5)) * 0.5 + 0.5) * r.width, r.top + (0.5 - nucleus.y) * r.height]; },
    holdFor(seconds) { for (let i = 0; i < seconds * 20; i++) step(1 / 20); draw(); },
  };
}
