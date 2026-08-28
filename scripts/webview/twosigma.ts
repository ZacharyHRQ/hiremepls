// Runs under `bun`, not Node/tsx — Two Sigma's careers board (a Phenom
// People site) is client-rendered with no public JSON API, so this drives a
// real headless browser via Bun.WebView (WebKit on macOS, Chrome/CDP on
// Linux) instead of fetch(). Invoked as a subprocess by src/ats/webview.ts;
// must print ONLY the JSON job array to stdout (all logging goes to stderr)
// so the parent can parse it.

export {};

interface RawCard {
  id: string;
  title: string;
  url: string;
  location: string;
}

const PAGE_SIZE = 10;
const BASE_URL = "https://careers.twosigma.com/careers/OpenRoles/";
const MAX_PAGES = Number(process.env.WEBVIEW_MAX_PAGES ?? 15);
const RENDER_WAIT_MS = 4000;

async function scrapePage(view: InstanceType<typeof Bun.WebView>, offset: number): Promise<RawCard[]> {
  const url = `${BASE_URL}?jobRecordsPerPage=${PAGE_SIZE}&jobOffset=${offset}`;
  await view.navigate(url);
  await new Promise((r) => setTimeout(r, RENDER_WAIT_MS));

  const cards = (await view.evaluate(`
    Array.from(document.querySelectorAll(".article--result")).map((card) => {
      const linkEl = card.querySelector(".article__header__text__title a");
      const spans = Array.from(card.querySelectorAll(".article__header__content__text .paragraph_inner-span"));
      const locEl = spans[0];
      if (!linkEl) return null;
      const href = linkEl.href;
      const match = href.match(/\\/(\\d+)$/);
      return {
        id: match ? match[1] : href,
        title: linkEl.textContent.trim(),
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
      const offset = page * PAGE_SIZE;
      const cards = await scrapePage(view, offset);
      console.error(`twosigma: offset ${offset} — ${cards.length} card(s)`);
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
    company: "Two Sigma",
  }));

  process.stdout.write(JSON.stringify(jobs));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
