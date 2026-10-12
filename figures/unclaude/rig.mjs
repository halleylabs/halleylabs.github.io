// UnClaude: arm kinematics and depth order, shared by the build and the live module.

// Inverse kinematics of a two-link SCARA arm: shoulder at S, links L1 and L2, elbow side `hand`.
export function reach([x, y], S, L1, L2, hand) {
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

export function wrap(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Forward kinematics: elbow E and quill Q from the joint angles.
export function joints({ a1, bend }, S, L1, L2) {
  const E = [S[0] + L1 * Math.cos(a1), S[1] + L1 * Math.sin(a1)];
  const a2 = a1 + bend;
  return { E, Q: [E[0] + L2 * Math.cos(a2), E[1] + L2 * Math.sin(a2)], a2 };
}

// A stadium (rounded link) between two plan points, as a floor ring for extrude.
export function stadium(a, b, ra, rb, steps = 14) {
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
export function boxOf(item, project) {
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
export function orderOf(items, project, view) {
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
export function itemsOf(pose, heads, G) {
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
