import type { Company, Job } from "../types.ts";

interface RipplingLocation {
  name?: string;
}

interface RipplingHit {
  objectID: string;
  name?: string;
  url?: string;
  departmentName?: string;
  locationNames?: string[];
  locations?: RipplingLocation[];
}

interface RipplingSearchResponse {
  hits: RipplingHit[];
  nbPages: number;
}

const APP_ID = "6FNAX3TBEF";
const API_KEY = "416caa4690f002ff6fe4a2097623640b";
const INDEX = "careers_en-US_production";
const HITS_PER_PAGE = 100;
const MAX_PAGES = 20;

function params(page: number): string {
  return new URLSearchParams({
    query: "",
    hitsPerPage: String(HITS_PER_PAGE),
    page: String(page),
  }).toString();
}

export async function fetchRipplingAlgolia(company: Company): Promise<Job[]> {
  const url = `https://${APP_ID}-dsn.algolia.net/1/indexes/${encodeURIComponent(INDEX)}/query`;
  const jobs: Job[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "hireme-bot",
        "X-Algolia-API-Key": API_KEY,
        "X-Algolia-Application-Id": APP_ID,
      },
      body: JSON.stringify({ params: params(page) }),
    });
    if (!res.ok) {
      throw new Error(`ripplingAlgolia ${company.name}: HTTP ${res.status}`);
    }

    const data = (await res.json()) as RipplingSearchResponse;
    for (const hit of data.hits) {
      if (!hit.name || !hit.url?.startsWith("http")) continue;
      const location =
        hit.locationNames?.join("; ") ??
        hit.locations?.map((loc) => loc.name).filter(Boolean).join("; ") ??
        "";
      jobs.push({
        id: hit.objectID,
        title: hit.name.trim(),
        url: hit.url,
        location,
        department: hit.departmentName ?? "",
        company: company.name,
      });
    }

    if (page + 1 >= data.nbPages) break;
  }

  return jobs;
}
