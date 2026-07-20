import type { Company, Job } from "../types.ts";

interface AzJob {
  id_icims: string;
  title: string;
  job_path: string;
  city?: string;
  location?: string;
  job_category?: string;
}

interface AzResponse {
  hits: number;
  jobs: AzJob[];
}

const PAGE_LIMIT = 100;
const BASE = "https://amazon.jobs";

export async function fetchAmazon(_company: Company): Promise<Job[]> {
  const all: AzJob[] = [];
  let offset = 0;

  while (true) {
    const url = `${BASE}/en/search.json?business_category%5B%5D=studentprograms&result_limit=${PAGE_LIMIT}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://amazon.jobs/en/",
      },
    });
    if (!res.ok) throw new Error(`amazon: HTTP ${res.status}`);
    const data = (await res.json()) as AzResponse;
    all.push(...data.jobs);
    if (data.jobs.length < PAGE_LIMIT || all.length >= data.hits) break;
    offset += PAGE_LIMIT;
  }

  return all.map((j) => ({
    id: j.id_icims,
    title: j.title,
    url: `${BASE}${j.job_path}`,
    location: j.city ?? j.location ?? "",
    department: j.job_category ?? "",
    company: "Amazon",
  }));
}
