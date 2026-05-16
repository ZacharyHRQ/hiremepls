import { isSoftwareEngineering } from "./filter.ts";
import type { Job } from "./types.ts";

const DIRECT_ATS_PATTERNS = [
  /greenhouse\.io/i,
  /ashbyhq\.com/i,
  /lever\.co/i,
  /workdayjobs\.com/i,
  /smartrecruiters\.com/i,
  /apply\.workable\.com/i,
];

const AGGREGATOR_PATTERNS = [
  /linkedin\.com/i,
  /jobright\.ai/i,
  /tealhq\.com/i,
  /lensa\.com/i,
  /recruit\.net/i,
  /snagajob\.com/i,
  /bebee\.com/i,
];

const HIGH_SIGNAL_TITLE_PATTERNS = [
  /\bsoftware\b/i,
  /\bswe\b/i,
  /\bmachine learning\b/i,
  /\bml\b/i,
  /\bdata (engineer|scientist)\b/i,
  /\bbackend\b/i,
  /\bfrontend\b/i,
  /\binfrastructure\b/i,
  /\bplatform\b/i,
  /\bsecurity\b/i,
  /\bquant/i,
];

const LOWER_SIGNAL_TITLE_PATTERNS = [
  /\bmarketing\b/i,
  /\bsales\b/i,
  /\baccounting\b/i,
  /\btax\b/i,
  /\baudit\b/i,
  /\bculinary\b/i,
  /\bretail\b/i,
];

export function scoreJob(job: Job): Job {
  let score = 50;
  const reasons: string[] = [];
  const haystack = `${job.title} ${job.department}`;

  if (isSoftwareEngineering(job)) {
    score += 25;
    reasons.push("SWE-aligned");
  }

  if (HIGH_SIGNAL_TITLE_PATTERNS.some((pattern) => pattern.test(haystack))) {
    score += 10;
    reasons.push("high-signal role");
  }

  if (/\b(new\s*grad|graduate)\b/i.test(haystack)) {
    score += 6;
    reasons.push("new grad");
  }

  if (DIRECT_ATS_PATTERNS.some((pattern) => pattern.test(job.url))) {
    score += 8;
    reasons.push("direct ATS");
  }

  if (/workatastartup\.com/i.test(job.url)) {
    score += 6;
    reasons.push("YC job");
  }

  if (AGGREGATOR_PATTERNS.some((pattern) => pattern.test(job.url))) {
    score -= 8;
    reasons.push("aggregator link");
  }

  if (LOWER_SIGNAL_TITLE_PATTERNS.some((pattern) => pattern.test(haystack))) {
    score -= 20;
    reasons.push("lower-fit title");
  }

  if (!job.location) {
    score -= 3;
    reasons.push("unknown location");
  }

  return {
    ...job,
    score: Math.max(0, Math.min(100, score)),
    scoreReasons: reasons,
  };
}

export function scoreJobs(jobs: Job[]): Job[] {
  return jobs.map(scoreJob);
}

export function compareJobsByScore(a: Job, b: Job): number {
  return (b.score ?? 0) - (a.score ?? 0) || a.company.localeCompare(b.company) || a.title.localeCompare(b.title);
}
