// Runs under `bun`, not Node/tsx — invoked as a subprocess by
// src/ats/webview.ts, which expects a JSON Job[] array on stdout (all
// logging goes to stderr). Millennium Management's careers board runs on
// Eightfold, whose client-rendered job cards carry no href (URLs are built
// client-side from React state), but Eightfold's own backend exposes the
// same data as plain JSON at /api/apply/v2/jobs — so this just fetches that
// directly instead of driving a real browser.

export {};

interface EightfoldPosition {
  id: number;
  name: string;
  location: string;
  department?: string;
}

interface EightfoldResponse {
  count: number;
  positions: EightfoldPosition[];
}

const DOMAIN = "mlp.com";
const PAGE_SIZE = 10;
const MAX_PAGES = Number(process.env.WEBVIEW_MAX_PAGES ?? 40);

async function fetchPage(start: number): Promise<EightfoldResponse> {
  const url = `https://mlp.eightfold.ai/api/apply/v2/jobs?domain=${DOMAIN}&start=${start}&num=${PAGE_SIZE}&sort_by=relevance`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`millennium: HTTP ${res.status} at start=${start}`);
  return (await res.json()) as EightfoldResponse;
}

async function main() {
  const seen = new Map<number, EightfoldPosition>();
  let total = Infinity;

  for (let page = 0; page < MAX_PAGES; page++) {
    const start = page * PAGE_SIZE;
    if (start >= total) break;
    const data = await fetchPage(start);
    total = data.count;
    console.error(`millennium: start ${start} — ${data.positions.length} of ${total}`);
    if (data.positions.length === 0) break;
    for (const p of data.positions) seen.set(p.id, p);
  }

  const jobs = Array.from(seen.values()).map((p) => ({
    id: String(p.id),
    title: p.name,
    url: `https://mlp.eightfold.ai/careers/job/${p.id}`,
    location: p.location,
    department: p.department ?? "",
    company: "Millennium Management",
  }));

  process.stdout.write(JSON.stringify(jobs));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
