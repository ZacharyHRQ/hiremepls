// Runs under `bun`, not Node/tsx — Apple's careers board is a client-rendered
// SPA with no public JSON API, so this drives a real headless browser via
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

// team=STDNT is Apple's "Students: Internships" filter — every result under
// it is already an internship posting by construction.
const BASE_URL = "https://jobs.apple.com/en-us/search?team=internships-STDNT-INTRN";
const MAX_PAGES = Number(process.env.WEBVIEW_MAX_PAGES ?? 6);
const RENDER_WAIT_MS = 3000;

async function scrapePage(view: InstanceType<typeof Bun.WebView>, page: number): Promise<RawCard[]> {
  const url = page === 1 ? BASE_URL : `${BASE_URL}&page=${page}`;
  await view.navigate(url);
  await new Promise((r) => setTimeout(r, RENDER_WAIT_MS));

  const cards = (await view.evaluate(`
    Array.from(document.querySelectorAll(".job-title")).map((row) => {
      const linkEl = row.querySelector(".job-title-link a");
      const locEl = row.querySelector(".job-title-location span:last-child");
      if (!linkEl) return null;
      const href = linkEl.getAttribute("href") || "";
      // Apple posts the same role separately per location, sharing the base
      // numeric ID but with a distinct "-<subid>" suffix — keep both parts
      // so location variants aren't collapsed into one job.
      const match = href.match(/\\/details\\/(\\d+-\\d+)/);
      return {
        id: match ? match[1] : href,
        title: linkEl.textContent.trim(),
        url: new URL(href, location.origin).href,
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
    for (let page = 1; page <= MAX_PAGES; page++) {
      const cards = await scrapePage(view, page);
      console.error(`apple: page ${page} — ${cards.length} card(s)`);
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
    company: "Apple",
  }));

  process.stdout.write(JSON.stringify(jobs));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
