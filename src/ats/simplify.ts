import type { Company, Job } from "../types.ts";

interface SimplifyListing {
  source: string;
  category: string;
  company_name: string;
  id: string;
  title: string;
  active: boolean;
  is_visible: boolean;
  terms: string[];
  date_posted?: number;
  date_updated?: number;
  url: string;
  locations?: string[];
}

const DEFAULT_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json";

export async function fetchSimplify(company: Company): Promise<Job[]> {
  const url = company.sourceUrl ?? DEFAULT_URL;
  const res = await fetch(url, {
    headers: { "User-Agent": "hireme-bot" },
  });
  if (!res.ok) {
    throw new Error(`simplify: HTTP ${res.status}`);
  }
  const all = (await res.json()) as SimplifyListing[];
  return all
    .filter((l) => l.active && l.is_visible)
    .map((l) => ({
      id: `simplify:${l.id}`,
      title: l.title,
      url: l.url,
      location: (l.locations ?? []).join(" / "),
      department: l.category ?? "",
      company: l.company_name,
    }));
}
