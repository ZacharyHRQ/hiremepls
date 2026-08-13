import { readFile, writeFile } from "node:fs/promises";
import { fetchGreenhouse } from "./ats/greenhouse.ts";
import { fetchLever } from "./ats/lever.ts";
import { fetchAshby } from "./ats/ashby.ts";
import { fetchWorkday } from "./ats/workday.ts";
import { fetchSimplify } from "./ats/simplify.ts";
import { fetchVanshb03 } from "./ats/vanshb03.ts";
import { fetchGithubMarkdown } from "./ats/githubMarkdown.ts";
import { fetchGithubJson } from "./ats/githubJson.ts";
import { fetchRipplingAlgolia } from "./ats/ripplingAlgolia.ts";
import { fetchSmartRecruiters } from "./ats/smartrecruiters.ts";
import { fetchWorkable } from "./ats/workable.ts";
import { fetchAmazon } from "./ats/amazon.ts";
import {
  isInternship,
  isSoftwareEngineering,
  passesLocation,
  parseLocationFilter,
} from "./filter.ts";
import { canonicalJobId, dedupeJobs } from "./dedupe.ts";
import { compareJobsByScore, scoreJobs } from "./rank.ts";
import { sendJob, sendText } from "./notifier.ts";
import { renderMarkdown } from "./render/markdown.ts";
import type {
  Company,
  CompanyHealth,
  Job,
  JobsSnapshot,
  SeenState,
  SnapshotError,
} from "./types.ts";

const SEEN_PATH = "seen.json";
const COMPANIES_PATH = "companies.json";
const JOBS_PATH = "jobs.json";
const MARKDOWN_PATH = "JOBS.md";
const HEALTH_PATH = "health.json";
// A single run every 15 min can fail for transient reasons (rate limits, network
// blips). Only alert once a source has been broken for this many consecutive
// runs (~45 min), and only once per outage — re-alerting resumes if it heals
// and breaks again.
const FAILURE_ALERT_THRESHOLD = 3;

async function loadJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function fetchCompany(c: Company): Promise<Job[]> {
  if (c.ats === "greenhouse") return fetchGreenhouse(c);
  if (c.ats === "lever") return fetchLever(c);
  if (c.ats === "ashby") return fetchAshby(c);
  if (c.ats === "workday") return fetchWorkday(c);
  if (c.ats === "simplify") return fetchSimplify(c);
  if (c.ats === "vanshb03") return fetchVanshb03(c);
  if (c.ats === "githubMarkdown") return fetchGithubMarkdown(c);
  if (c.ats === "githubJson") return fetchGithubJson(c);
  if (c.ats === "ripplingAlgolia") return fetchRipplingAlgolia(c);
  if (c.ats === "smartrecruiters") return fetchSmartRecruiters(c);
  if (c.ats === "workable") return fetchWorkable(c);
  if (c.ats === "amazon") return fetchAmazon(c);
  if (c.ats === "manual") return [];
  throw new Error(`unknown ats: ${c.ats}`);
}

function emptySnapshot(): JobsSnapshot {
  return {
    generatedAt: "",
    companyCount: 0,
    okCount: 0,
    jobCount: 0,
    firstSeen: {},
    jobs: [],
    errors: [],
  };
}

function buildPreviousFirstSeen(snapshot: JobsSnapshot): Record<string, string> {
  const firstSeen: Record<string, string> = {};

  for (const [id, ts] of Object.entries(snapshot.firstSeen ?? {})) {
    firstSeen[id] = ts;
  }

  for (const job of snapshot.jobs ?? []) {
    const canonicalId = canonicalJobId(job);
    const ts = snapshot.firstSeen[job.id];
    if (ts && (!firstSeen[canonicalId] || ts < firstSeen[canonicalId])) {
      firstSeen[canonicalId] = ts;
    }
  }

  return firstSeen;
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const dryRun = process.argv.includes("--dry-run") || !token || chatIds.length === 0;
  if (dryRun && !process.argv.includes("--dry-run")) {
    console.warn("⚠ TELEGRAM_BOT_TOKEN/CHAT_ID missing — running in dry-run mode");
  }

  const companies = await loadJson<Company[]>(COMPANIES_PATH, []);
  const seen = await loadJson<SeenState>(SEEN_PATH, {});
  const previousSnapshot = await loadJson<JobsSnapshot>(JOBS_PATH, emptySnapshot());
  const next: SeenState = { ...seen };
  const firstRun = Object.keys(seen).length === 0;
  const generatedAt = new Date().toISOString();
  const allInterns: Job[] = [];
  const errors: SnapshotError[] = [];
  let okCount = 0;

  const sweOnly = process.env.SWE_ONLY === "true";
  const locationFilter = parseLocationFilter(process.env.LOCATION_FILTER);
  if (sweOnly || locationFilter) {
    console.log(
      `Filters: ${sweOnly ? "SWE_ONLY " : ""}${locationFilter ? `LOCATION="${locationFilter.join(",")}"` : ""}`.trim(),
    );
  }

  const matchesAll = (j: Job): boolean => {
    if (!isInternship(j)) return false;
    if (sweOnly && !isSoftwareEngineering(j)) return false;
    if (locationFilter && !passesLocation(j, locationFilter)) return false;
    return true;
  };

  for (const company of companies) {
    let jobs: Job[];
    try {
      jobs = await fetchCompany(company);
    } catch (e) {
      const message = (e as Error).message;
      console.warn(`✗ ${company.name}: ${message}`);
      errors.push({ company: company.name, message });
      continue;
    }
    okCount++;

    const interns = jobs.filter(matchesAll);
    allInterns.push(...interns);
    const ids = interns.map((j) => j.id);
    next[company.name] = ids;

    console.log(
      `✓ ${company.name}: ${jobs.length} total, ${interns.length} intern`,
    );
  }

  const health = await loadJson<CompanyHealth>(HEALTH_PATH, {});
  const nextHealth: CompanyHealth = {};
  const newlyBroken: { company: string; message: string; failures: number }[] = [];
  for (const err of errors) {
    const prev = health[err.company];
    const consecutiveFailures = (prev?.consecutiveFailures ?? 0) + 1;
    const alerted = prev?.alerted ?? false;
    nextHealth[err.company] = { consecutiveFailures, lastError: err.message, alerted };
    if (consecutiveFailures >= FAILURE_ALERT_THRESHOLD && !alerted) {
      newlyBroken.push({ company: err.company, message: err.message, failures: consecutiveFailures });
      nextHealth[err.company].alerted = true;
    }
  }
  await writeFile(HEALTH_PATH, JSON.stringify(nextHealth, null, 2) + "\n");

  if (newlyBroken.length > 0) {
    const lines = newlyBroken.map(
      (b) => `⚠ <b>${b.company}</b> has failed ${b.failures} runs in a row: ${b.message}`,
    );
    console.warn(lines.join("\n"));
    if (!dryRun) {
      for (const chatId of chatIds) {
        try {
          await sendText(token!, chatId, lines.join("\n\n"));
        } catch (e) {
          console.warn(`  ✗ broken-source alert failed (${chatId}): ${(e as Error).message}`);
        }
      }
    }
  }

  const jobs = scoreJobs(dedupeJobs(allInterns));
  const previousFirstSeen = buildPreviousFirstSeen(previousSnapshot);
  const firstSeen: Record<string, string> = {};
  const currentIds = new Set(jobs.map((j) => j.id));
  for (const [id, ts] of Object.entries(previousFirstSeen)) {
    if (currentIds.has(id)) firstSeen[id] = ts;
  }
  const newJobs: Job[] = [];
  for (const job of jobs) {
    if (!firstSeen[job.id]) newJobs.push(job);
    if (!firstSeen[job.id]) firstSeen[job.id] = generatedAt;
  }

  if (!firstRun) {
    for (const job of newJobs.sort(compareJobsByScore)) {
      if (dryRun) {
        console.log(`  [dry-run] would notify: ${job.title} — ${job.url}`);
        continue;
      }
      for (const chatId of chatIds) {
        try {
          await sendJob(token!, chatId, job);
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          console.warn(`  ✗ notify failed (${chatId}): ${(e as Error).message}`);
        }
      }
    }
  }

  const snapshot: JobsSnapshot = {
    generatedAt,
    companyCount: companies.length,
    okCount,
    jobCount: jobs.length,
    firstSeen,
    jobs,
    errors,
  };

  await writeFile(JOBS_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  await writeFile(MARKDOWN_PATH, renderMarkdown(snapshot));
  await writeFile(SEEN_PATH, JSON.stringify(next, null, 2) + "\n");

  console.log(
    firstRun
      ? `\nFirst run — seeded ${Object.keys(next).length} companies, no alerts sent.`
      : `\nDone. ${newJobs.length} new internship(s) notified.`,
  );
  console.log(
    `Snapshot: ${snapshot.jobCount} open internships across ${snapshot.okCount}/${snapshot.companyCount} companies.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
