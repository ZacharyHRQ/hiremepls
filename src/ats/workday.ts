import type { Company, Job } from "../types.ts";

interface WdLocation {
  descriptor?: string;
}

interface WdJobPosting {
  title: string;
  externalPath: string;
  locationsText?: string;
  bulletFields?: string[];
  postedOn?: string;
  jobPosting?: string;
}

interface WdResponse {
  total: number;
  jobPostings: WdJobPosting[];
}

const PAGE_LIMIT = 20;
const MAX_PAGES = 25;

export async function fetchWorkday(company: Company): Promise<Job[]> {
  if (!company.cluster || !company.site) {
    throw new Error(
      `workday ${company.slug}: missing cluster/site (need both for ${company.name})`,
    );
  }
  const base = `https://${company.slug}.${company.cluster}.myworkdayjobs.com`;
  const apiUrl = `${base}/wday/cxs/${company.slug}/${company.site}/jobs`;
  const viewBase = `${base}/en-US/${company.site}`;

  const all: WdJobPosting[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "hireme-bot",
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit: PAGE_LIMIT,
        offset,
        searchText: "",
      }),
    });
    if (!res.ok) {
      throw new Error(`workday ${company.slug}: HTTP ${res.status}`);
    }
    const data = (await res.json()) as WdResponse;
    all.push(...data.jobPostings);
    if (data.jobPostings.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
    if (offset >= data.total) break;
  }

  return all.map((p) => {
    const path = p.externalPath?.startsWith("/") ? p.externalPath : `/${p.externalPath ?? ""}`;
    return {
      id: path,
      title: p.title,
      url: `${viewBase}${path}`,
      location: p.locationsText ?? "",
      department: "",
      company: company.name,
    };
  });
}
