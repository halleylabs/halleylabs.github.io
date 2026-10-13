// Sibling coherence: in every row of side-by-side siblings, matching parts (same tag+class) must sit at the same y.
// node coherence.mjs <baseUrl> <paths,...> <widths,...>
import { spawn } from "node:child_process";
const [base, pathsArg, widthsArg] = process.argv.slice(2);
const paths = pathsArg.split(","), widths = widthsArg.split(",").map(Number);
const PORT = 9900 + Math.floor(Math.random() * 90);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/cohprof-" + PORT, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws; for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p = t.find((x) => x.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(150); }
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
const CHECK = `(() => {
  const sig = e => e.tagName.toLowerCase() + '.' + ([...e.classList].find(c => !c.startsWith('astro') && !c.startsWith('is-') && c !== 'reveal' && c !== 'enter') || '');
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.display !== 'none' && s.visibility !== 'hidden'; };
  const out = [];
  for (const parent of document.querySelectorAll('main *, footer *')) {
    const kids = [...parent.children].filter(vis);
    if (kids.length < 2) continue;
    // group kids into rows by their top edge
    const rows = {};
    for (const k of kids) { const t = Math.round(k.getBoundingClientRect().top / 4); (rows[t] ||= []).push(k); }
    for (const row of Object.values(rows)) {
      if (row.length < 2) continue;
      const s0 = sig(row[0]); if (!row.every(k => sig(k) === s0)) continue; // only true siblings of one kind
      const slots = row.map(k => { const top = k.getBoundingClientRect().top, m = {}; for (const d of k.querySelectorAll('*')) { if (!vis(d) || d.closest('svg') && d.tagName !== 'svg') continue; const g = sig(d); if (!(g in m)) m[g] = Math.round(d.getBoundingClientRect().top - top); } return m; });
      const common = Object.keys(slots[0]).filter(g => slots.every(m => g in m));
      const bad = common.map(g => [g, slots.map(m => m[g])]).filter(([, ys]) => Math.max(...ys) - Math.min(...ys) > 3);
      const missing = [...new Set(slots.flatMap(Object.keys))].filter(g => !slots.every(m => g in m) && slots.filter(m => g in m).length >= 1);
      const bottoms = row.map(k => Math.round(k.getBoundingClientRect().bottom));
      if (bad.length || missing.length) out.push({ where: s0 + ' in ' + sig(parent) + ' "' + (row[0].textContent || '').trim().slice(0, 24) + '"', y: Math.round(row[0].getBoundingClientRect().top + scrollY), misaligned: bad.slice(0, 5).map(([g, ys]) => g + ' ' + ys.join('/')), missing: missing.slice(0, 5) });
    }
  }
  return JSON.stringify(out);
})()`;
await send("Page.enable");
for (const p of paths) for (const W of widths) {
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: 900, deviceScaleFactor: 1, mobile: W < 768 });
  await send("Page.navigate", { url: `${base}${p}?nolenis&all` }); await sleep(1600);
  const h = await ev("document.documentElement.scrollHeight"); for (let y = 0; y < h; y += 800) { await ev(`scrollTo(0,${y})`); await sleep(120); } await ev("scrollTo(0,0)"); await sleep(1200);
  const r = JSON.parse(await ev(CHECK));
  for (const x of r) console.log(`${p}@${W}`, x.where, '@y' + x.y, x.misaligned.length ? 'MIS ' + x.misaligned.join(' | ') : '', x.missing.length ? 'MISSING ' + x.missing.join(',') : '');
}
ws.close(); chrome.kill();
