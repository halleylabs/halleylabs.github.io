// Frame-timing probe: headless Chrome (GPU on), CPU throttled, real scroll gestures through a page.
// node perf.mjs <url> [--cpu 4] [--w 390 --h 844] [--dpr 3]
import { spawn } from "node:child_process";
const a = process.argv.slice(2), url = a[0];
const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? Number(a[i + 1]) : d; };
const cpu = opt("--cpu", 4), W = opt("--w", 390), H = opt("--h", 844), DPR = opt("--dpr", 3), PORT = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/perfprof-" + PORT, "--no-first-run", "--mute-audio", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws; for (let i = 0; i < 50; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p = t.find((x) => x.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(150); }
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DPR, mobile: W < 768 });
await send("Emulation.setCPUThrottlingRate", { rate: cpu });
await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__f=[];window.__lt=[];(function l(t){__f.push(t);requestAnimationFrame(l)})(performance.now());new PerformanceObserver(l=>l.getEntries().forEach(e=>__lt.push([e.startTime,e.duration]))).observe({type:'longtask',buffered:true});` });
const t0 = Date.now(); await send("Page.navigate", { url });
await sleep(6000);
const load = await ev(`JSON.stringify({lt:__lt.filter(x=>x[1]>50).map(x=>Math.round(x[1])), tbt:Math.round(__lt.reduce((s,x)=>s+Math.max(0,x[1]-50),0))})`);
await ev(`(__f.length=0,__lt.length=0,1)`);
const total = await ev(`document.documentElement.scrollHeight - innerHeight`);
// scroll the whole page with touch-like gestures
const steps = Math.ceil(total / (H * 0.6));
for (let i = 0; i < steps; i++) { await send("Input.synthesizeScrollGesture", { x: Math.round(W / 2), y: Math.round(H * 0.7), yDistance: -Math.round(H * 0.6), speed: 1400, gestureSourceType: "touch", repeatCount: 1 }); }
const r = JSON.parse(await ev(`(function(){const d=[];for(let i=1;i<__f.length;i++)d.push(__f[i]-__f[i-1]);d.sort((a,b)=>a-b);const q=p=>d[Math.floor(p*(d.length-1))]||0;const long=d.filter(x=>x>34).length;return JSON.stringify({frames:d.length,p50:q(.5).toFixed(1),p95:q(.95).toFixed(1),p99:q(.99).toFixed(1),janky:(100*long/Math.max(1,d.length)).toFixed(1)+'%',lt:__lt.filter(x=>x[1]>50).length,ltMax:Math.round(Math.max(0,...__lt.map(x=>x[1])))})})()`));
console.log(JSON.stringify({ url, cpu, W, load: JSON.parse(load), scroll: r }));
ws.close(); chrome.kill();
