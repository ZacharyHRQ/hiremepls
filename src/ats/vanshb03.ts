import type { Company, Job } from "../types.ts";

interface VanshListing {
  id: string;
  title: string;
  company_name: string;
  url: string;
  active: boolean;
  is_visible: boolean;
  season?: string;
  locations?: string[];
  date_posted?: number;
  source?: string;
}

const LISTINGS_URL =
  "https://raw.githubusercontent.com/vanshb03/Summer2026-Internships/dev/.github/scripts/listings.json";

const ACCEPTED_SEASONS = new Set(["Summer", "Fall", "Spring", "Winter"]);

export async function fetchVanshb03(company: Company): Promise<Job[]> {
  const res = await fetch(LISTINGS_URL, {
    headers: { "User-Agent": "hireme-bot" },
  });
  if (!res.ok) {
    throw new Error(`vanshb03: HTTP ${res.status}`);
  }
  const all = (await res.json()) as VanshListing[];
  return all
    .filter((l) => l.active && l.is_visible)
    .filter((l) => !l.season || ACCEPTED_SEASONS.has(l.season))
    .map((l) => ({
      id: `vansh:${l.id}`,
      title: l.title,
      url: l.url,
      location: (l.locations ?? []).join(" / "),
      department: "",
      company: l.company_name,
    }));
}
