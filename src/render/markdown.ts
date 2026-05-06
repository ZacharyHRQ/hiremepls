import type { Job, JobsSnapshot } from "../types.ts";

function cell(s: string | undefined): string {
  if (!s) return "—";
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim() || "—";
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function groupByCompany(jobs: Job[]): Map<string, Job[]> {
  const map = new Map<string, Job[]>();
  for (const j of jobs) {
    const list = map.get(j.company) ?? [];
    list.push(j);
    map.set(j.company, list);
  }
  return map;
}

function renderTable(jobs: Job[], firstSeen: Record<string, string>): string {
  const rows = [
    "| Title | Location | Department | First seen |",
    "| --- | --- | --- | --- |",
  ];
  const sorted = [...jobs].sort((a, b) => {
    const ta = firstSeen[a.id] ?? "";
    const tb = firstSeen[b.id] ?? "";
    if (ta !== tb) return tb.localeCompare(ta);
    return a.title.localeCompare(b.title);
  });
  for (const j of sorted) {
    rows.push(
      `| [${cell(j.title)}](${j.url}) | ${cell(j.location)} | ${cell(j.department)} | ${fmtDate(firstSeen[j.id])} |`,
    );
  }
  return rows.join("\n");
}

export function renderMarkdown(snapshot: JobsSnapshot): string {
  const out: string[] = [];
  const updated = fmtDate(snapshot.generatedAt);
  out.push("# Open Internships");
  out.push("");
  out.push(
    `**${snapshot.jobCount}** internships across **${snapshot.okCount}/${snapshot.companyCount}** companies — last updated ${updated}.`,
  );
  out.push("");

  if (snapshot.jobCount === 0) {
    out.push("_No open internships in the current snapshot._");
  } else {
    const grouped = groupByCompany(snapshot.jobs);
    const companies = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

    out.push("## Companies");
    out.push("");
    for (const c of companies) {
      const count = grouped.get(c)!.length;
      const anchor = c.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      out.push(`- [${c}](#${anchor}) (${count})`);
    }
    out.push("");

    for (const c of companies) {
      out.push(`## ${c}`);
      out.push("");
      out.push(renderTable(grouped.get(c)!, snapshot.firstSeen));
      out.push("");
    }
  }

  if (snapshot.errors.length > 0) {
    out.push("## Errors this run");
    out.push("");
    for (const e of snapshot.errors) {
      out.push(`- **${e.company}**: ${cell(e.message)}`);
    }
    out.push("");
  }

  return out.join("\n");
}
