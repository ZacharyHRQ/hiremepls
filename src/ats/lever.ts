import type { Company, Job } from "../types.ts";

interface LvPosting {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: {
    team?: string;
    department?: string;
    location?: string;
    commitment?: string;
  };
}

export async function fetchLever(company: Company): Promise<Job[]> {
  const url = `https://api.lever.co/v0/postings/${company.slug}?mode=json`;
  const res = await fetch(url, { headers: { "User-Agent": "hireme-bot" } });
  if (!res.ok) {
    throw new Error(`lever ${company.slug}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as LvPosting[];
  return data.map((j) => ({
    id: j.id,
    title: j.text,
    url: j.hostedUrl,
    location: j.categories?.location ?? "",
    department: j.categories?.department ?? j.categories?.team ?? "",
    company: company.name,
  }));
}
