import github from "../data/github.json";
import media from "../data/media.json";

export interface Metric { value: string; label: string; source: string }
export interface Release { tag: string; name: string; date: string; url: string }
export interface Project {
  slug: string;
  name: string;
  repo: string;
  category: string;
  language: string | null;
  license: string | null;
  version: string | null;
  tagline: string;
  summary: string;
  metrics: Metric[];
  features: string[];
  how_it_works: string[];
  install: string | null;
  quickstart: string | null;
  links: Record<string, string | null>;
  stars: number;
  releases: Release[];
  demo?: { src: string; poster: string; w: number; h: number };
}

const files = import.meta.glob<{ default: Omit<Project, "stars" | "releases" | "demo"> }>("../data/projects/*.json", { eager: true });
const gh = github as Record<string, { stars: number; releases: Release[] }>;
const md = media as Record<string, { hero: { src: string; poster: string; w: number; h: number } }>;

// The order the lab tells its story in: voice and agents first, then the infrastructure, then libraries.
export const CATEGORY_ORDER = ["Voice", "Agents", "Agent infrastructure", "Developer tools", "Libraries"];
export const FEATURED = ["faultline", "tring", "witness", "quicky-wiki", "fasthands", "samemark"];

export const projects: Project[] = Object.values(files)
  .map((f) => {
    const p = f.default;
    const g = gh[p.repo] ?? { stars: 0, releases: [] };
    const hero = md[p.slug]?.hero;
    return {
      ...p,
      stars: g.stars ?? 0,
      releases: g.releases ?? [],
      demo: hero ? { src: hero.src.replace("/assets/media/", "/media/"), poster: hero.poster.replace("/assets/media/", "/media/"), w: hero.w, h: hero.h } : undefined,
    } as Project;
  })
  .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || b.stars - a.stars || a.name.localeCompare(b.name));

export const bySlug = (slug: string) => projects.find((p) => p.slug === slug);
export const featured = FEATURED.map((s) => bySlug(s)).filter((p): p is Project => Boolean(p));

// The latest release of every project, newest first: the lab's almanac.
export const releases = projects
  .flatMap((p) => (p.releases[0] ? [{ project: p, release: p.releases[0] }] : []))
  .sort((a, b) => b.release.date.localeCompare(a.release.date));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
};
// Only counts that mean something are shown.
export const starsWorthShowing = (p: Project) => p.stars >= 10;
