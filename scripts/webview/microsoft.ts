// Runs under `bun`, not Node/tsx — Microsoft's careers board (Eightfold,
// same platform as Netflix/Millennium) is client-rendered with no working
// unauthenticated JSON API (the /api/apply/v2/jobs endpoint 403s here), but
// direct URL navigation with `start=`/`query=`/`domain=` query params does
// render real paginated results, so this drives a real headless browser via
// Bun.WebView (WebKit on macOS, Chrome/CDP on Linux) instead of fetch().
// Invoked as a subprocess by src/ats/webview.ts; must print ONLY the JSON
// job array to stdout (all logging goes to stderr) so the parent can parse it.

export {};

interface RawCard {
  id: string;
  title: string;
  url: string;
  location: string;
}

const HOST = "https://apply.careers.microsoft.com/careers";
const QUERY = "software engineer";
const DOMAIN = "microsoft.com";
const PAGE_SIZE = 10;
const MAX_PAGES = Number(process.env.WEBVIEW_MAX_PAGES ?? 20);
const RENDER_WAIT_MS = 4000;

async function scrapePage(view: InstanceType<typeof Bun.WebView>, start: number): Promise<RawCard[]> {
  const params = new URLSearchParams({ start: String(start), query: QUERY, domain: DOMAIN, sort_by: "timestamp" });
  await view.navigate(`${HOST}?${params}`);
  await new Promise((r) => setTimeout(r, RENDER_WAIT_MS));

  const cards = (await view.evaluate(`
    Array.from(document.querySelectorAll('[data-test-id="job-listing"] a[href*="/careers/job/"]')).map((linkEl) => {
      const titleEl = linkEl.querySelector(".title-1aNJK");
      const locEl = linkEl.querySelector(".fieldValue-3kEar");
      const href = new URL(linkEl.getAttribute("href"), location.origin).href;
      const match = href.match(/\\/job\\/(\\d+)/);
      if (!titleEl) return null;
      return {
        id: match ? match[1] : href,
        title: titleEl.textContent.trim(),
        url: href,
        location: locEl ? locEl.textContent.trim() : "",
      };
    }).filter(Boolean)
  `)) as RawCard[];

  return cards;
}

async function main() {
  const view = new Bun.WebView({ headless: true });
  const seen = new Map<string, RawCard>();

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const start = page * PAGE_SIZE;
      const cards = await scrapePage(view, start);
      console.error(`microsoft: start ${start} — ${cards.length} card(s)`);
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
    company: "Microsoft",
  }));

  process.stdout.write(JSON.stringify(jobs));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
