// Shapes the build and the live code share: a token clipped at the hood mouths, its four
// probe dimples, and the belt's cleats. Self-contained (the kit's slabOf and iso come in as
// arguments), so the live module can inline this source.

// A token is { x, y, z }: its centre on the floor plane and its bottom.
export function tokenPaths(t, size, mouths, slabOf, P) {
  let x0 = t.x - size.len / 2;
  let x1 = t.x + size.len / 2;
  if (Math.abs(t.y) < 1 && t.z > 15) {
    x0 = Math.max(x0, mouths[0]);
    x1 = Math.min(x1, mouths[1]);
  }
  if (x1 - x0 < 0.3) return null;
  const plan = { x: x0, y: t.y - size.wide / 2, w: x1 - x0, d: size.wide, r: Math.min(2, (x1 - x0) / 2) };
  return slabOf(plan, t.z, size.h, P, 3, 0.5);
}

export function tokenDots(t, size, probes, mouths, iso, P) {
  if (t.x < mouths[0] || t.x > mouths[1]) return probes.map(() => null);
  return probes.map((py) => iso([t.x, t.y + py, t.z + size.h], P));
}

// Cleats across the belt top, `phase` units along, every `pitch`, between the hood mouths.
export function cleatsPath(phase, pitch, from, to, half, z, iso, P) {
  const out = [];
  const start = from + ((((phase % pitch) + pitch) % pitch) || pitch) - pitch;
  for (let x = start; x <= to; x += pitch) {
    if (x < from + 0.5 || x > to - 0.5) continue;
    const a = iso([x, -half, z], P);
    const b = iso([x, half, z], P);
    out.push(`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  }
  return out.join("");
}
