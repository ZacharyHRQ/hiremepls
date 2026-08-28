// Runs under `bun`, not Node/tsx — invoked as a subprocess by
// src/ats/webview.ts, which expects a JSON Job[] array on stdout (all
// logging goes to stderr). Netflix's careers board runs on Eightfold, whose
// client-rendered job cards carry no href (URLs are built client-side from
// React state), but Eightfold's own backend exposes the same data as plain
// JSON at /api/apply/v2/jobs — so this just fetches that directly instead
// of driving a real browser. Scoped to the Engineering team filter (via the
// same `Teams=` query params jobs.netflix.com/careers/engineering links to)
// since this repo tracks software-engineering roles, not Netflix's full
// firm-wide listing (500+ roles across marketing, content, legal, etc.).

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

const DOMAIN = "netflix.com";
const HOST = "https://explore.jobs.netflix.net";
const TEAMS = ["Engineering", "Engineering Operations"];
const PAGE_SIZE = 10;
const MAX_PAGES = Number(process.env.WEBVIEW_MAX_PAGES ?? 40);

async function fetchPage(start: number): Promise<EightfoldResponse> {
  const params = new URLSearchParams({ domain: DOMAIN, start: String(start), num: String(PAGE_SIZE), sort_by: "relevance" });
  for (const t of TEAMS) params.append("Teams", t);
  const res = await fetch(`${HOST}/api/apply/v2/jobs?${params}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`netflix: HTTP ${res.status} at start=${start}`);
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
    console.error(`netflix: start ${start} — ${data.positions.length} of ${total}`);
    if (data.positions.length === 0) break;
    for (const p of data.positions) seen.set(p.id, p);
  }

  const jobs = Array.from(seen.values()).map((p) => ({
    id: String(p.id),
    title: p.name,
    url: `${HOST}/careers/job/${p.id}`,
    location: p.location,
    department: p.department ?? "",
    company: "Netflix",
  }));

  process.stdout.write(JSON.stringify(jobs));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
