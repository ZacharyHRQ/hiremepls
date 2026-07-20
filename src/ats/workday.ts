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
const MAX_ATTEMPTS = 2;

async function fetchWorkdayPage(
  company: Company,
  apiUrl: string,
  viewBase: string,
  offset: number,
): Promise<WdResponse> {
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: `https://${company.slug}.${company.cluster}.myworkdayjobs.com`,
        Referer: `${viewBase}/`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) hireme-bot/0.1 Safari/537.36",
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit: PAGE_LIMIT,
        offset,
        searchText: "",
      }),
    });
    if (!res.ok) {
      lastError = `HTTP ${res.status}`;
      continue;
    }

    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    if (!contentType.includes("application/json")) {
      lastError = `expected JSON, got ${contentType || "unknown content type"}: ${body.slice(0, 80)}`;
      continue;
    }

    try {
      return JSON.parse(body) as WdResponse;
    } catch (e) {
      lastError = `invalid JSON: ${(e as Error).message}`;
    }
  }

  throw new Error(`workday ${company.slug}: ${lastError}`);
}

export async function fetchWorkday(company: Company): Promise<Job[]> {
  if (!company.cluster || !company.site) {
    throw new Error(
      `workday ${company.slug}: missing cluster/site (need both for ${company.name})`,
    );
  }

  // Shared-domain Workday (e.g. wd1.myworkdaysite.com) uses tenant/site path
  // rather than a company-specific subdomain.
  const isShared = !!company.tenant;
  const base = isShared
    ? `https://${company.cluster}.myworkdaysite.com`
    : `https://${company.slug}.${company.cluster}.myworkdayjobs.com`;
  const tenant = company.tenant ?? company.slug;
  const apiUrl = `${base}/wday/cxs/${tenant}/${company.site}/jobs`;
  const viewBase = isShared
    ? `${base}/recruiting/${tenant}/${company.site}`
    : `${base}/en-US/${company.site}`;

  const all: WdJobPosting[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchWorkdayPage(company, apiUrl, viewBase, offset);
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
