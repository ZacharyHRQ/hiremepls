// Runs under `bun`, not Node/tsx — D. E. Shaw's careers board is a
// client-rendered SPA with no public JSON API, so this drives a real
// headless browser via Bun.WebView (WebKit on macOS, Chrome/CDP on Linux)
// instead of fetch(). Invoked as a subprocess by src/ats/webview.ts; must
// print ONLY the JSON job array to stdout (all logging goes to stderr) so
// the parent can parse it.
//
// All open roles render on one page (no pagination/load-more) at
// /careers/experienced-professionals.

export {};

interface RawCard {
  id: string;
  title: string;
  url: string;
  location: string;
}

const URL_ = "https://www.deshaw.com/careers/experienced-professionals";
const RENDER_WAIT_MS = 5000;

async function main() {
  const view = new Bun.WebView({ headless: true });
  let cards: RawCard[] = [];

  try {
    await view.navigate(URL_);
    await new Promise((r) => setTimeout(r, RENDER_WAIT_MS));

    cards = (await view.evaluate(`
      Array.from(document.querySelectorAll(".job-filter-results .job")).map((card) => {
        const linkEl = card.querySelector("a.parent-arrow-long");
        const locEl = card.querySelector(".location");
        const titleEl = card.querySelector(".job-display-name");
        if (!linkEl || !titleEl) return null;
        const href = new URL(linkEl.getAttribute("href"), location.origin).href;
        return {
          id: card.getAttribute("data-job-id") || href,
          title: titleEl.textContent.trim(),
          url: href,
          location: locEl ? locEl.textContent.trim() : "",
        };
      }).filter(Boolean)
    `)) as RawCard[];
  } finally {
    await view.close?.();
  }

  console.error(`deshaw: ${cards.length} card(s)`);

  const jobs = cards.map((c) => ({
    id: c.id,
    title: c.title,
    url: c.url,
    location: c.location,
    department: "",
    company: "D. E. Shaw",
  }));

  process.stdout.write(JSON.stringify(jobs));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
