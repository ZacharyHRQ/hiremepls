import type { Company, Job } from "../types.ts";

interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  locationName?: string;
  department?: string;
  departmentName?: string;
  team?: string;
  employmentType?: string;
}

export async function fetchAshby(company: Company): Promise<Job[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${company.slug}`;
  const res = await fetch(url, { headers: { "User-Agent": "hireme-bot" } });
  if (!res.ok) {
    throw new Error(`ashby ${company.slug}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { jobs: AshbyJob[] };
  return data.jobs.map((j) => ({
    id: j.id,
    title: j.title,
    url: j.jobUrl,
    location: j.locationName ?? "",
    department: j.departmentName ?? j.department ?? j.team ?? "",
    company: company.name,
  }));
}
