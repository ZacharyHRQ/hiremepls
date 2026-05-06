import { readFile, writeFile } from "node:fs/promises";
import { fetchGreenhouse } from "./ats/greenhouse.ts";
import { fetchLever } from "./ats/lever.ts";
import { fetchAshby } from "./ats/ashby.ts";
import { isInternship } from "./filter.ts";
import { sendJob } from "./notifier.ts";
import { renderMarkdown } from "./render/markdown.ts";
import type {
  Company,
  Job,
  JobsSnapshot,
  SeenState,
  SnapshotError,
} from "./types.ts";

const SEEN_PATH = "seen.json";
const COMPANIES_PATH = "companies.json";
const JOBS_PATH = "jobs.json";
const MARKDOWN_PATH = "JOBS.md";

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

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const dryRun = process.argv.includes("--dry-run") || !token || !chatId;
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
  let totalNew = 0;

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

    const interns = jobs.filter(isInternship);
    allInterns.push(...interns);
    const ids = interns.map((j) => j.id);
    const previous = new Set(seen[company.name] ?? []);
    const newJobs = interns.filter((j) => !previous.has(j.id));
    next[company.name] = ids;

    console.log(
      `✓ ${company.name}: ${jobs.length} total, ${interns.length} intern, ${newJobs.length} new`,
    );

    if (firstRun) continue;

    for (const job of newJobs) {
      totalNew++;
      if (dryRun) {
        console.log(`  [dry-run] would notify: ${job.title} — ${job.url}`);
        continue;
      }
      try {
        await sendJob(token!, chatId!, job);
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.warn(`  ✗ notify failed: ${(e as Error).message}`);
      }
    }
  }

  const firstSeen: Record<string, string> = {};
  const currentIds = new Set(allInterns.map((j) => j.id));
  for (const [id, ts] of Object.entries(previousSnapshot.firstSeen ?? {})) {
    if (currentIds.has(id)) firstSeen[id] = ts;
  }
  for (const job of allInterns) {
    if (!firstSeen[job.id]) firstSeen[job.id] = generatedAt;
  }

  const snapshot: JobsSnapshot = {
    generatedAt,
    companyCount: companies.length,
    okCount,
    jobCount: allInterns.length,
    firstSeen,
    jobs: allInterns,
    errors,
  };

  await writeFile(JOBS_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  await writeFile(MARKDOWN_PATH, renderMarkdown(snapshot));
  await writeFile(SEEN_PATH, JSON.stringify(next, null, 2) + "\n");

  console.log(
    firstRun
      ? `\nFirst run — seeded ${Object.keys(next).length} companies, no alerts sent.`
      : `\nDone. ${totalNew} new internship(s) notified.`,
  );
  console.log(
    `Snapshot: ${snapshot.jobCount} open internships across ${snapshot.okCount}/${snapshot.companyCount} companies.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
