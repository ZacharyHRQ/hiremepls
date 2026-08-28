// Runs under `bun`, not Node/tsx — Sea Limited's (Shopee/Garena parent)
// careers board is a client-rendered SPA with no public JSON API, so this
// drives a real headless browser via Bun.WebView (WebKit on macOS,
// Chrome/CDP on Linux) instead of fetch(). Invoked as a subprocess by
// src/ats/webview.ts; must print ONLY the JSON job array to stdout (all
// logging goes to stderr) so the parent can parse it.
//
// Pagination is via a simple ?page=N query param (page 1 has no param).

export {};

interface RawCard {
  id: string;
  title: string;
  url: string;
  location: string;
  department: string;
}

const BASE_URL = "https://career.sea.com/jobs";
const MAX_PAGES = Number(process.env.WEBVIEW_MAX_PAGES ?? 10);
const RENDER_WAIT_MS = 6000;

async function scrapePage(view: InstanceType<typeof Bun.WebView>, page: number): Promise<RawCard[]> {
  const url = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
  await view.navigate(url);
  await new Promise((r) => setTimeout(r, RENDER_WAIT_MS));

  const cards = (await view.evaluate(`
    Array.from(document.querySelectorAll('a[href^="/position/"]')).map((a) => {
      const href = new URL(a.getAttribute("href"), location.origin).href;
      const title = a.querySelector("div")?.textContent?.trim() || "";
      const fields = Array.from(a.querySelectorAll(".truncate")).map((e) => e.textContent.trim());
      const match = href.match(/\\/position\\/([^/?]+)/);
      if (!title) return null;
      return {
        id: match ? match[1] : href,
        title,
        url: href,
        department: fields[0] || "",
        location: fields[1] || "",
      };
    }).filter(Boolean)
  `)) as RawCard[];

  return cards;
}

async function main() {
  const view = new Bun.WebView({ headless: true });
  const seen = new Map<string, RawCard>();

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const cards = await scrapePage(view, page);
      console.error(`sea: page ${page} — ${cards.length} card(s)`);
      if (cards.length === 0) break;
      for (const c of cards) seen.set(c.id, c);
    }
  } finally {
    await view.close?.();
  }

  const jobs = Array.from(seen.values()).map((c) => ({
    id: c.id,
    title: c.title,
    url: c.url,
    location: c.location,
    department: c.department,
    company: "Sea Limited",
  }));

  process.stdout.write(JSON.stringify(jobs));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
