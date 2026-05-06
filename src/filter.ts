import type { Job } from "./types.ts";

const INTERN_PATTERNS = [
  /\bintern\b/i,
  /\binternship\b/i,
  /\bsummer\s+(analyst|associate|trader|researcher|engineer)\b/i,
  /\b(graduate|new\s*grad)\b/i,
];

export function isInternship(job: Job): boolean {
  const haystack = `${job.title} ${job.department}`;
  return INTERN_PATTERNS.some((p) => p.test(haystack));
}
