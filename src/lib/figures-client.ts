// Fetches each figure as it nears the screen, then mounts its own live module:
// "hover" on the cards, "tour" on a project page.
type Live = { mount: (root: Element, o: { mode: string }) => unknown };
const live = import.meta.glob("../figures/*.live.js") as Record<string, () => Promise<Live>>;

async function load(el: HTMLElement) {
  const res = await fetch(el.dataset.src!, { priority: "low" } as RequestInit);
  if (!res.ok) return;
  el.innerHTML = await res.text();
  el.classList.add("is-loaded");
  const mod = live[`../figures/${el.dataset.fig}.live.js`];
  if (!mod) return;
  const mode = el.dataset.mode ?? "hover";
  const root = el.closest(mode === "hover" ? ".plate" : ".fcard") ?? el;
  (await mod()).mount(root, { mode });
}

export function mountFigures() {
  // figures never compete with the page's own text, fonts and first paint: they start after load
  if (document.readyState !== "complete") { addEventListener("load", mountFigures, { once: true }); return; }
  const els = document.querySelectorAll<HTMLElement>("[data-fig]:not([data-mounted])");
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    load(e.target as HTMLElement).catch((err) => console.warn("figure", (e.target as HTMLElement).dataset.fig, err));
  }), { rootMargin: "400px 0px" });
  els.forEach((el) => { el.dataset.mounted = ""; io.observe(el); });
}
