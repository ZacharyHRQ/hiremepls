import type { Company, Job } from "../types.ts";

interface SrLocation {
  city?: string;
  region?: string;
  country?: string;
  fullLocation?: string;
}

interface SrPosting {
  id: string;
  uuid?: string;
  name: string;
  refNumber?: string;
  company?: { identifier?: string; name?: string };
  location?: SrLocation;
  department?: { label?: string };
  function?: { label?: string };
}

interface SrResponse {
  totalFound: number;
  offset: number;
  limit: number;
  content: SrPosting[];
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;

export async function fetchSmartRecruiters(company: Company): Promise<Job[]> {
  const all: SrPosting[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `https://api.smartrecruiters.com/v1/companies/${company.slug}/postings?limit=${PAGE_LIMIT}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "hireme-bot", Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`smartrecruiters ${company.slug}: HTTP ${res.status}`);
    }
    const data = (await res.json()) as SrResponse;
    all.push(...data.content);
    if (data.content.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
    if (offset >= data.totalFound) break;
  }

  return all.map((p) => ({
    id: p.id,
    title: p.name,
    url: `https://jobs.smartrecruiters.com/${company.slug}/${p.id}`,
    location: p.location?.fullLocation ?? "",
    department: p.department?.label ?? p.function?.label ?? "",
    company: company.name,
  }));
}
