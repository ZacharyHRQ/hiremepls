// Runs under `bun`, not Node/tsx — Susquehanna (SIG) uses an Angular/iCIMS
// job search widget with no public JSON API and pagination driven entirely
// by client-side state (Angular Material paginator, no URL query params),
// so this drives a real headless browser via Bun.WebView (WebKit on macOS,
// Chrome/CDP on Linux) and clicks "next page" instead of navigating URLs.
// Invoked as a subprocess by src/ats/webview.ts; must print ONLY the JSON
// job array to stdout (all logging goes to stderr) so the parent can parse it.
//
// Scoped to the "technology" job category (careers.sig.com/technology/jobs)
// rather than the full careers.sig.com/jobs firm-wide list, since this repo
// tracks software-engineering roles.

export {};

interface RawCard {
  id: string;
  title: string;
  url: string;
  location: string;
}

const URL_ = "https://careers.sig.com/technology/jobs";
const MAX_PAGES = Number(process.env.WEBVIEW_MAX_PAGES ?? 15);
const RENDER_WAIT_MS = 5000;
const CLICK_WAIT_MS = 2500;

async function readCards(view: InstanceType<typeof Bun.WebView>): Promise<RawCard[]> {
  return (await view.evaluate(`
    Array.from(document.querySelectorAll(".search-result-item")).map((card) => {
      const linkEl = card.querySelector(".job-title-link");
      const locEl = card.querySelector(".job-result__location .location.label-value");
      if (!linkEl) return null;
      const href = new URL(linkEl.getAttribute("href"), location.origin).href;
      const match = href.match(/\\/jobs\\/(\\d+)/);
      return {
        id: match ? match[1] : href,
        title: linkEl.textContent.trim(),
        url: href,
        location: locEl ? locEl.textContent.trim().replace(/\\s+/g, " ") : "",
      };
    }).filter(Boolean)
  `)) as RawCard[];
}

async function main() {
  const view = new Bun.WebView({ headless: true });
  const seen = new Map<string, RawCard>();

  try {
    await view.navigate(URL_);
    await new Promise((r) => setTimeout(r, RENDER_WAIT_MS));

    for (let page = 1; page <= MAX_PAGES; page++) {
      const cards = await readCards(view);
      console.error(`sig: page ${page} — ${cards.length} card(s)`);
      if (cards.length === 0) break;
      for (const c of cards) seen.set(c.id, c);

      const clicked = await view.evaluate(`
        (() => {
          const btn = document.querySelector(".mat-paginator-navigation-next");
          if (!btn || btn.disabled || btn.classList.contains("mat-button-disabled")) return false;
          btn.click();
          return true;
        })()
      `);
      if (!clicked) break;
      await new Promise((r) => setTimeout(r, CLICK_WAIT_MS));
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
    company: "Susquehanna (SIG)",
  }));

  process.stdout.write(JSON.stringify(jobs));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
