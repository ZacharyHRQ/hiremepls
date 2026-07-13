import { createHash } from "node:crypto";
import type { Company, Job } from "../types.ts";

interface GithubJsonJob {
  id?: string;
  company?: string;
  title?: string;
  season?: string;
  category?: string;
  location?: string;
  url?: string;
}

interface GithubJsonFeed {
  jobs?: GithubJsonJob[];
}

function fallbackId(company: Company, job: GithubJsonJob): string {
  const hash = createHash("sha1")
    .update(`${company.slug}:${job.company ?? ""}:${job.title ?? ""}:${job.url ?? ""}`)
    .digest("hex")
    .slice(0, 12);
  return `github-json:${company.slug}:${hash}`;
}

export async function fetchGithubJson(company: Company): Promise<Job[]> {
  if (!company.sourceUrl) {
    throw new Error(`githubJson ${company.name}: missing sourceUrl`);
  }

  const res = await fetch(company.sourceUrl, {
    headers: { "User-Agent": "hireme-bot" },
  });
  if (!res.ok) {
    throw new Error(`githubJson ${company.name}: HTTP ${res.status}`);
  }

  const feed = (await res.json()) as GithubJsonFeed;
  return (feed.jobs ?? [])
    .filter((job) => job.company && job.title && job.url?.startsWith("http"))
    .map((job) => ({
      id: job.id ? `github-json:${company.slug}:${job.id}` : fallbackId(company, job),
      title: job.title!,
      url: job.url!,
      location: job.location ?? "",
      department: [job.category, job.season].filter(Boolean).join(" / "),
      company: job.company!,
    }));
}
