// Runs under `bun`, not Node/tsx — Citadel Securities' careers board is a
// client-rendered SPA with no public JSON API (same WordPress template as
// citadel.com), so this drives a real headless browser via Bun.WebView
// (WebKit on macOS, Chrome/CDP on Linux) instead of fetch(). Invoked as a
// subprocess by src/ats/webview.ts; must print ONLY the JSON job array to
// stdout (all logging goes to stderr) so the parent can parse it.

export {};

interface RawCard {
  id: string;
  title: string;
  url: string;
  location: string;
}

const BASE_URL = "https://www.citadelsecurities.com/careers/open-opportunities/";
const MAX_PAGES = Number(process.env.WEBVIEW_MAX_PAGES ?? 12);
const RENDER_WAIT_MS = 4000;

async function scrapePage(view: InstanceType<typeof Bun.WebView>, page: number): Promise<RawCard[]> {
  const url = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;
  await view.navigate(url);
  await new Promise((r) => setTimeout(r, RENDER_WAIT_MS));

  const cards = (await view.evaluate(`
    Array.from(document.querySelectorAll(".careers-listing-card")).map((card) => {
      const href = card.getAttribute("href") || "";
      const title = card.getAttribute("data-position") || card.querySelector("h2")?.textContent?.trim() || "";
      const locEl = card.querySelector(".careers-listing-card__location");
      if (!href || !title) return null;
      return {
        id: href,
        title,
        url: href,
        location: locEl ? locEl.textContent.trim().replace(/\\s+/g, " ") : "",
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
      console.error(`citadelsecurities: page ${page} — ${cards.length} card(s)`);
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
    department: "",
    company: "Citadel Securities",
  }));

  process.stdout.write(JSON.stringify(jobs));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
