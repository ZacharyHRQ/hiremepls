import type { Company, Job } from "../types.ts";

interface WkLocation {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  workplace?: string;
}

interface WkPosting {
  id: string;
  shortcode: string;
  title: string;
  full_title?: string;
  application_url?: string;
  url?: string;
  state?: string;
  department?: string;
  employment_type?: string;
  locations?: WkLocation[];
  remote?: boolean;
}

interface WkResponse {
  total: number;
  results: WkPosting[];
}

const PAGE_LIMIT = 50;
const MAX_PAGES = 25;

export async function fetchWorkable(company: Company): Promise<Job[]> {
  const url = `https://apply.workable.com/api/v3/accounts/${company.slug}/jobs`;
  const all: WkPosting[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "hireme-bot",
      },
      body: JSON.stringify({
        query: "",
        location: [],
        department: [],
        workplace: [],
        limit: PAGE_LIMIT,
        offset,
      }),
    });
    if (!res.ok) {
      throw new Error(`workable ${company.slug}: HTTP ${res.status}`);
    }
    const data = (await res.json()) as WkResponse;
    all.push(...data.results);
    if (data.results.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
    if (offset >= data.total) break;
  }

  return all.map((p) => {
    const loc = p.locations
      ?.map((l) => [l.city, l.region, l.country].filter(Boolean).join(", "))
      .join(" / ") ?? "";
    return {
      id: p.shortcode || p.id,
      title: p.title,
      url:
        p.application_url ??
        p.url ??
        `https://apply.workable.com/${company.slug}/j/${p.shortcode}/`,
      location: loc || (p.remote ? "Remote" : ""),
      department: p.department ?? "",
      company: company.name,
    };
  });
}
