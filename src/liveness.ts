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
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 8;

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
  const live: Job[] = [];
  const queue = [...jobs];

  async function worker() {
    for (;;) {
      const job = queue.shift();
      if (!job) return;

      const cached = cache[job.url];
      const isFreshAliveCache =
        cached?.alive && Date.now() - Date.parse(cached.checkedAt) < ALIVE_TTL_MS;

      if (isFreshAliveCache) {
        nextCache[job.url] = cached!;
        live.push(job);
        continue;
      }

      const alive = await probe(job.url);
      nextCache[job.url] = { alive, checkedAt: new Date().toISOString() };
      if (alive) live.push(job);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { live, cache: nextCache };
}
