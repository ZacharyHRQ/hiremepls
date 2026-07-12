import { createHash } from "node:crypto";
import type { Job } from "./types.ts";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(inc|incorporated|llc|ltd|corp|corporation|co|company)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTitle(value: string): string {
  return normalize(value)
    .replace(/\b(2026|2027|summer|fall|spring|winter)\b/g, "")
    .replace(/\b(internship|intern|co op|coop)\b/g, "intern")
    .trim();
}

function stripTracking(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (
        key.startsWith("utm_") ||
        key === "gh_src" ||
        key === "lever-source" ||
        key === "source"
      ) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = "";
    if (parsed.hostname.endsWith("greenhouse.io")) {
      parsed.hostname = "greenhouse.io";
    }
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function canonicalJobId(job: Job): string {
  const key = [
    normalize(job.company),
    normalizeTitle(job.title),
    normalize(job.location),
  ].join("|");
  const hash = createHash("sha1").update(key).digest("hex").slice(0, 16);
  return `canonical:${hash}`;
}

function score(job: Job): number {
  let value = 0;
  if (job.url.includes("greenhouse.io") || job.url.includes("ashbyhq.com")) value += 3;
  if (job.url.includes("lever.co")) value += 3;
  if (job.url.includes("workdayjobs.com")) value += 2;
  if (job.department) value += 1;
  if (job.location) value += 1;
  if (!job.url.includes("linkedin.com")) value += 1;
  return value;
}

function mergeJobs(existing: Job, incoming: Job): Job {
  const primary = score(incoming) > score(existing) ? incoming : existing;
  const fallback = primary === incoming ? existing : incoming;

  return {
    ...primary,
    id: existing.id,
    location: primary.location || fallback.location,
    department: primary.department || fallback.department,
  };
}

export function dedupeJobs(jobs: Job[]): Job[] {
  const byUrl = new Map<string, Job>();
  for (const job of jobs) {
    const id = stripTracking(job.url);
    const existing = byUrl.get(id);
    byUrl.set(id, existing ? mergeJobs(existing, job) : job);
  }

  const byKey = new Map<string, Job>();

  for (const job of byUrl.values()) {
    const id = canonicalJobId(job);
    const next = { ...job, id };
    const existing = byKey.get(id);
    byKey.set(id, existing ? mergeJobs(existing, next) : next);
  }

  return [...byKey.values()];
}
