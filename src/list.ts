import { readFile } from "node:fs/promises";
import type { Job, JobsSnapshot } from "./types.ts";

const JOBS_PATH = "jobs.json";

interface Flags {
  company?: string;
  grep?: RegExp;
  location?: string;
  limit?: number;
  sort?: "new" | "score";
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--company" && next) {
      flags.company = next.toLowerCase();
      i++;
    } else if (a === "--grep" && next) {
      flags.grep = new RegExp(next, "i");
      i++;
    } else if (a === "--location" && next) {
      flags.location = next.toLowerCase();
      i++;
    } else if (a === "--limit" && next) {
      flags.limit = Number(next);
      i++;
    } else if (a === "--sort" && next) {
      flags.sort = next === "score" ? "score" : "new";
      i++;
    }
  }
  return flags;
}

function applyFilters(jobs: Job[], flags: Flags): Job[] {
  return jobs.filter((j) => {
    if (flags.company && !j.company.toLowerCase().includes(flags.company)) {
      return false;
    }
    if (flags.location && !j.location.toLowerCase().includes(flags.location)) {
      return false;
    }
    if (flags.grep && !flags.grep.test(`${j.title} ${j.department}`)) {
      return false;
    }
    return true;
  });
}

const COLOR = process.stdout.isTTY;
const dim = (s: string) => (COLOR ? `\x1b[2m${s}\x1b[0m` : s);
const bold = (s: string) => (COLOR ? `\x1b[1m${s}\x1b[0m` : s);
const cyan = (s: string) => (COLOR ? `\x1b[36m${s}\x1b[0m` : s);

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  let snapshot: JobsSnapshot;
  try {
    snapshot = JSON.parse(await readFile(JOBS_PATH, "utf8")) as JobsSnapshot;
  } catch {
    console.error(
      `No ${JOBS_PATH} found. Run 'npm run check -- --dry-run' first to generate one.`,
    );
    process.exit(1);
  }

  const filtered = applyFilters(snapshot.jobs, flags);
  filtered.sort((a, b) => {
    if (flags.sort === "score") {
      const score = (b.score ?? 0) - (a.score ?? 0);
      if (score !== 0) return score;
    }
    const ta = snapshot.firstSeen[a.id] ?? "";
    const tb = snapshot.firstSeen[b.id] ?? "";
    if (ta !== tb) return tb.localeCompare(ta);
    if (flags.sort !== "score") {
      const score = (b.score ?? 0) - (a.score ?? 0);
      if (score !== 0) return score;
    }
    return a.company.localeCompare(b.company) || a.title.localeCompare(b.title);
  });

  const limited = flags.limit ? filtered.slice(0, flags.limit) : filtered;

  console.log(
    bold(
      `${filtered.length} of ${snapshot.jobCount} internships ` +
        `(snapshot from ${snapshot.generatedAt.slice(0, 10)})`,
    ),
  );
  console.log("");

  let currentCompany = "";
  for (const j of limited) {
    if (j.company !== currentCompany) {
      currentCompany = j.company;
      console.log(bold(`▍ ${currentCompany}`));
    }
    const seen = snapshot.firstSeen[j.id]?.slice(0, 10) ?? "—";
    const score = typeof j.score === "number" ? ` ${dim(`· score ${j.score}`)}` : "";
    const loc = j.location ? ` ${dim("·")} ${j.location}` : "";
    console.log(`  ${j.title}${loc}${score} ${dim(`(first seen ${seen})`)}`);
    console.log(`  ${cyan(j.url)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
