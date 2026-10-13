// Layout audit: overlaps between visible text/controls, horizontal overflow, clipped text; plus a full-page shot.
// node audit.mjs <baseUrl> <outDir> <slug,...> <width,...>
import { spawn } from "node:child_process"; import { writeFileSync } from "node:fs";
const [base, out, slugsArg, widthsArg] = process.argv.slice(2);
const slugs = slugsArg.split(","), widths = widthsArg.split(",").map(Number);
const PORT = 9800 + Math.floor(Math.random() * 100);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/audprof-" + PORT, "--no-first-run", "--mute-audio", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws; for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p = t.find((x) => x.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(150); }
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable");
const AUDIT = `(() => {
  const sel = 'h1,h2,h3,h4,p,li,dt,dd,a,button,b,span,figcaption,label,.t-label,.t-data,svg.ico,video,img,figure,[data-fig]';
  const els = [...document.querySelectorAll('main ' + sel.split(',').join(',main '))].filter(e => {
    const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false;
    const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2;
  });
  // keep leaves: elements that do not contain another candidate
  const leaves = els.filter(e => !els.some(o => o !== e && e.contains(o)) || ['VIDEO','IMG','svg'].includes(e.tagName) || e.dataset.fig !== undefined);
  const name = e => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').filter(c=>!c.startsWith('astro')).slice(0,2).join('.') : '') + ' "' + (e.textContent||'').trim().slice(0, 28) + '"');
  const R = leaves.map(e => [e, e.getBoundingClientRect()]);
  const hits = [];
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const [a, ra] = R[i], [b, rb] = R[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 3 && oy > 3) hits.push(name(a) + '  X  ' + name(b) + ' (' + Math.round(ox) + 'x' + Math.round(oy) + ' @y' + Math.round(ra.top + scrollY) + ')');
  }
  const over = [...document.querySelectorAll('main *')].filter(e => { const s = getComputedStyle(e); return e.scrollWidth > e.clientWidth + 2 && s.overflowX !== 'visible' && s.overflowX !== 'clip' && !['PRE','CODE'].includes(e.tagName) && s.overflowX !== 'auto'; }).map(name).slice(0, 8);
  const wide = [...document.querySelectorAll('main *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).filter(e => !e.closest('[data-fig]') && !e.closest('.art')).map(e => name(e) + ' r=' + Math.round(e.getBoundingClientRect().right)).slice(0, 8);
  return JSON.stringify({ hits: hits.slice(0, 30), nh: hits.length, over, wide, docW: document.documentElement.scrollWidth, W: innerWidth });
})()`;
const report = {};
for (const slug of slugs) for (const W of widths) {
  const H = W < 600 ? 844 : W < 1100 ? 1024 : 900;
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768 });
  await send("Page.navigate", { url: `${base}/work/${slug}/?nolenis&all` });
  await sleep(1800);
  // walk the page so lazy figures load, then back to the top
  const h = await ev("document.documentElement.scrollHeight");
  for (let y = 0; y < h; y += H) { await ev(`scrollTo(0, ${y})`); await sleep(250); }
  await ev("scrollTo(0,0)"); await sleep(900);
  await ev("document.querySelector('[data-hd]').style.visibility='hidden'");
  const r = JSON.parse(await ev(AUDIT));
  report[`${slug}@${W}`] = r;
  const full = await ev("document.documentElement.scrollHeight");
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 70, captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: full, scale: W > 800 ? 0.5 : 1 } });
  writeFileSync(`${out}/${slug}-${W}.jpg`, Buffer.from(shot.result.data, "base64"));
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) console.log(k, "overlaps", v.nh, "overflow", v.over.length, "offscreen", v.wide.length, v.docW > v.W ? "HSCROLL " + v.docW : "");
ws.close(); chrome.kill();
