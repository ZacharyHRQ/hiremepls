import { compareJobsByScore } from "../rank.ts";
import type { Job } from "../types.ts";
import type { UserRecord } from "./types.ts";

function containsAny(value: string, needles: string[]): boolean {
  const lower = value.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function preferenceBoost(job: Job, user: UserRecord): { boost: number; reasons: string[] } {
  let boost = 0;
  const reasons: string[] = [];
  const haystack = `${job.title} ${job.department}`.toLowerCase();

  if (user.profile.roles.length > 0 && containsAny(haystack, user.profile.roles)) {
    boost += 10;
    reasons.push("role preference");
  }

  if (user.profile.locations.length > 0) {
    if (containsAny(job.location, user.profile.locations)) {
      boost += 8;
      reasons.push("location preference");
    } else if (job.location) {
      boost -= 12;
      reasons.push("outside target location");
    }
  }

  return { boost, reasons };
}

export function matchJobs(jobs: Job[], user: UserRecord): Job[] {
  return jobs
    .filter((job) => user.jobs[job.id]?.state !== "skipped")
    .filter((job) => user.jobs[job.id]?.state !== "applied")
    .map((job) => {
      const preference = preferenceBoost(job, user);
      const score = Math.max(0, Math.min(100, (job.score ?? 50) + preference.boost));
      return {
        ...job,
        score,
        scoreReasons: [...(job.scoreReasons ?? []), ...preference.reasons],
      };
    })
    .filter((job) => (job.score ?? 0) >= user.profile.minScore)
    .sort(compareJobsByScore);
}

export function savedJobs(jobs: Job[], user: UserRecord): Job[] {
  return jobs
    .filter((job) => user.jobs[job.id]?.state === "saved")
    .map((job) => ({ ...job, scoreReasons: job.scoreReasons ?? [] }))
    .sort(compareJobsByScore);
}
