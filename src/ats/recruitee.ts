import type { Company, Job } from "../types.ts";

interface RecruiteeOffer {
  id: number;
  title: string;
  slug: string;
  careers_url: string;
  city?: string;
  country?: string;
  location?: string;
  department?: string;
  remote?: boolean;
}

interface RecruiteeResponse {
  offers: RecruiteeOffer[];
}

export async function fetchRecruitee(company: Company): Promise<Job[]> {
  const url = `https://${company.slug}.recruitee.com/api/offers/`;
  const res = await fetch(url, {
    headers: { "User-Agent": "hireme-bot", Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`recruitee ${company.slug}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as RecruiteeResponse;

  return (data.offers ?? []).map((o) => ({
    id: `recruitee:${company.slug}:${o.id}`,
    title: o.title,
    url: o.careers_url,
    location: o.location || (o.remote ? "Remote" : ""),
    department: o.department ?? "",
    company: company.name,
  }));
}
