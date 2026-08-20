import type { Job } from "./types.ts";

export interface LivenessEntry {
  alive: boolean;
  checkedAt: string;
}

export type LivenessCache = Record<string, LivenessEntry>;

// Once a URL is confirmed alive, trust it for a while instead of re-probing
// every 15-minute run. Dead URLs are always re-probed (cheap: usually a fast
// 404/410) so a repost is picked up on the next run.
const ALIVE_TTL_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 6_000;
const CONCURRENCY = 30;
// Hard ceiling on the whole pass regardless of queue size or individual
// timeouts, so a volume spike or a run of runner-side connection stalls
// can never block the 15-minute CI schedule. Anything not probed by the
// deadline is treated as live (fail open) rather than dropped.
const OVERALL_BUDGET_MS = 3 * 60 * 1000;

// Some ATSes return 200 but redirect to a generic "listing closed" page
// instead of a 404/410 (e.g. Greenhouse's job-board error page).
const DEAD_REDIRECT_MARKERS = [/[?&]error=true\b/i, /\/job[_-]?not[_-]?found\b/i];

async function probe(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "hireme-bot" },
    });
    if (res.status === 404 || res.status === 410) return false;
    if (!res.ok) return false;
    if (DEAD_REDIRECT_MARKERS.some((re) => re.test(res.url))) return false;
    return true;
  } catch {
    // Network hiccup / timeout — fail open so a transient blip doesn't drop
    // a real posting.
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export async function filterLive(
  jobs: Job[],
  cache: LivenessCache,
): Promise<{ live: Job[]; cache: LivenessCache }> {
  const nextCache: LivenessCache = {};

  // Probe each distinct URL once, even if multiple aggregator sources list
  // the same posting.
  const urls = [...new Set(jobs.map((j) => j.url))];
  const results = new Map<string, boolean>();
  const deadline = Date.now() + OVERALL_BUDGET_MS;
  const queue = [...urls];

  async function worker() {
    for (;;) {
      if (Date.now() > deadline) return;
      const url = queue.shift();
      if (!url) return;

      const cached = cache[url];
      const isFreshAliveCache =
        cached?.alive && Date.now() - Date.parse(cached.checkedAt) < ALIVE_TTL_MS;

      if (isFreshAliveCache) {
        nextCache[url] = cached!;
        results.set(url, true);
        continue;
      }

      const alive = await probe(url);
      nextCache[url] = { alive, checkedAt: new Date().toISOString() };
      results.set(url, alive);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Anything left in the queue past the deadline never got probed — fail
  // open rather than silently drop postings we simply ran out of time for.
  for (const url of queue) {
    if (!results.has(url)) results.set(url, true);
  }

  const live = jobs.filter((j) => results.get(j.url) !== false);
  return { live, cache: nextCache };
}
