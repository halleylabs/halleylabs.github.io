// Anatomy figures (vendor/anatomy, MIT): one machine per project, built by figures/<slug>/build.mjs into src/figures.
// The SVGs ship as cached files and are fetched as each one nears the screen, so a page of fourteen stays light.
const urls = import.meta.glob("../figures/*.svg", { query: "?url", import: "default", eager: true }) as Record<string, string>;

export function figureUrl(slug: string): string | undefined {
  return urls[`../figures/${slug}.svg`];
}
