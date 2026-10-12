// Refresh stars and recent releases for every project from the GitHub API, before the build.
// Uses GITHUB_TOKEN when present (CI). On any failure the cached data/github.json is kept.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const dir = new URL("../src/data/", import.meta.url);
const out = new URL("github.json", dir);
const cache = JSON.parse(readFileSync(out, "utf8"));
const headers = { Accept: "application/vnd.github+json", "User-Agent": "halleylabs-www" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const repos = readdirSync(new URL("projects/", dir)).map((f) => JSON.parse(readFileSync(new URL(`projects/${f}`, dir), "utf8")).repo);
let ok = 0;
for (const repo of repos) {
  try {
    const [info, rels] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}`, { headers }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch(`https://api.github.com/repos/${repo}/releases?per_page=5`, { headers }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ]);
    cache[repo] = {
      stars: info.stargazers_count ?? 0,
      pushed_at: info.pushed_at,
      releases: rels.filter((r) => !r.draft).map((r) => ({ tag: r.tag_name, name: r.name || r.tag_name, date: (r.published_at || "").slice(0, 10), url: r.html_url })),
    };
    ok++;
  } catch (e) {
    console.warn(`github: kept cache for ${repo} (${e})`);
  }
}
writeFileSync(out, JSON.stringify(cache, null, 2) + "\n");
console.log(`github: refreshed ${ok} of ${repos.length} repos`);
