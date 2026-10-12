// A small solid box on any axes, shaded by the kit's rules (four side tones by facing, a lighter
// top), so the limit-switch flag can tilt about a horizontal pivot. Self-contained: the live
// module inlines this source.

const FLAG_LEVER = 9; // lever from the pivot to the flag plate
const FLAG_PLATE = [0.6, 4.5, 6]; // half thickness, half width, half height
const FLAG_PLATE_AT = 14; // plate centre above the pivot

function camOf(P) {
  const a = ((P.azimuth ?? 45) * Math.PI) / 180;
  const e = ((P.elevation ?? 30) * Math.PI) / 180;
  return { sA: Math.sin(a), cA: Math.cos(a), sE: Math.sin(e), cE: Math.cos(e), k: P.scale * Math.sqrt(1.6) };
}
function isoOf([x, y, z], P, c) {
  return [P.origin[0] + (x * c.sA - y * c.cA) * c.k, P.origin[1] + ((x * c.cA + y * c.sA) * c.sE - z * c.cE) * c.k];
}
const tenthOf = (v) => {
  const t = (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return t === "-0" ? "0" : t;
};
const pathFrom = (pts, closed) => pts.map(([x, y], i) => `${i ? "L" : "M"}${tenthOf(x)} ${tenthOf(y)}`).join("") + (closed ? "Z" : "");
function hullOf(points) {
  const s = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const p of s) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  const up = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

// centre c, unit axes [u, v, w], half sizes [hu, hv, hw]
export function boxPaths(c, axes, half, P) {
  const cam = camOf(P);
  const view = [cam.cA * cam.cE, cam.sA * cam.cE, cam.sE];
  const light = [-cam.sA, cam.cA];
  const corner = (s) => [0, 1, 2].map((i) => c[i] + axes[0][i] * half[0] * s[0] + axes[1][i] * half[1] * s[1] + axes[2][i] * half[2] * s[2]);
  const faces = [];
  for (let i = 0; i < 3; i++) {
    for (const sign of [-1, 1]) {
      const j = (i + 1) % 3;
      const k = (i + 2) % 3;
      const quad = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
        const s = [0, 0, 0];
        s[i] = sign;
        s[j] = a;
        s[k] = b;
        return s;
      });
      const n = axes[i].map((v) => v * sign);
      const facing = n[0] * view[0] + n[1] * view[1] + n[2] * view[2];
      faces.push({ i, sign, quad, n, visible: facing > 1e-6 });
    }
  }
  const shades = ["", "", "", ""];
  let top = "";
  const all = [];
  for (const f of faces) {
    const pts = f.quad.map((s) => isoOf(corner(s), P, cam));
    all.push(...pts);
    if (!f.visible) continue;
    const d = pathFrom(pts, true);
    if (f.n[2] > 0.6) top += d;
    else {
      const len = Math.hypot(f.n[0], f.n[1]) || 1;
      const lit = ((f.n[0] / len) * light[0] + (f.n[1] / len) * light[1] + 1) / 2;
      shades[Math.min(3, Math.max(0, Math.floor(lit * 4)))] += d;
    }
  }
  let crease = "";
  for (let a = 0; a < faces.length; a++) {
    for (let b = a + 1; b < faces.length; b++) {
      const fa = faces[a];
      const fb = faces[b];
      if (!fa.visible || !fb.visible || fa.i === fb.i) continue;
      const k = 3 - fa.i - fb.i;
      const s0 = [0, 0, 0];
      s0[fa.i] = fa.sign;
      s0[fb.i] = fb.sign;
      s0[k] = -1;
      const s1 = s0.slice();
      s1[k] = 1;
      crease += pathFrom([isoOf(corner(s0), P, cam), isoOf(corner(s1), P, cam)]);
    }
  }
  const outline = pathFrom(hullOf(all), true);
  return { fill: outline, shades, top, crease, outline };
}

// The flag of a limit switch: a short lever up from the pivot carrying a flat plate that faces
// the travel it guards. `angle` tilts it toward +travel.
export function flagSolids(sw, angle, pivotZ, P) {
  const t = sw.travel === "x" ? [1, 0, 0] : [0, 1, 0];
  const a = sw.travel === "x" ? [0, 1, 0] : [1, 0, 0];
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const up = [t[0] * s, t[1] * s, c];
  const u = [t[0] * c, t[1] * c, -s];
  const pivot = [sw.at[0], sw.at[1], pivotZ];
  const at = (h) => pivot.map((v, i) => v + up[i] * h);
  return {
    lever: boxPaths(at(FLAG_LEVER / 2 + 0.2), [u, a, up], [0.6, 0.6, FLAG_LEVER / 2 + 0.2], P),
    plate: boxPaths(at(FLAG_PLATE_AT), [u, a, up], FLAG_PLATE, P),
  };
}
