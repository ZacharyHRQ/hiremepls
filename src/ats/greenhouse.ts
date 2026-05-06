import type { Company, Job } from "../types.ts";

interface GhJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  departments?: { name?: string }[];
  offices?: { name?: string }[];
}

export async function fetchGreenhouse(company: Company): Promise<Job[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs`;
  const res = await fetch(url, { headers: { "User-Agent": "hireme-bot" } });
  if (!res.ok) {
    throw new Error(`greenhouse ${company.slug}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { jobs: GhJob[] };
  return data.jobs.map((j) => ({
    id: String(j.id),
    title: j.title,
    url: j.absolute_url,
    location: j.location?.name ?? "",
    department: j.departments?.[0]?.name ?? "",
    company: company.name,
  }));
}
