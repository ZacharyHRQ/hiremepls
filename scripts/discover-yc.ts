interface YcCompany {
  name: string;
  slug: string;
  website?: string;
  all_locations?: string;
  one_liner?: string;
  industry?: string;
  batch?: string;
  status?: string;
  isHiring?: boolean;
  tags?: string[];
  url?: string;
}

const YC_COMPANIES_URL = "https://yc-oss.github.io/api/companies/all.json";
const DEFAULT_TAGS = [
  "ai",
  "artificial intelligence",
  "developer tools",
  "infrastructure",
  "open source",
  "security",
  "fintech",
  "analytics",
  "data",
];

function getFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function parseTags(raw: string | undefined): string[] {
  return (raw ? raw.split(",") : DEFAULT_TAGS)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function matchesTags(company: YcCompany, wanted: string[]): boolean {
  const haystack = [
    company.industry,
    company.one_liner,
    ...(company.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return wanted.some((tag) => haystack.includes(tag));
}

const limit = Number(getFlag("limit") ?? "40");
const tags = parseTags(getFlag("tags"));

const res = await fetch(YC_COMPANIES_URL, {
  headers: { "User-Agent": "hireme-yc-discovery" },
});
if (!res.ok) {
  throw new Error(`yc discovery: HTTP ${res.status}`);
}

const companies = ((await res.json()) as YcCompany[])
  .filter((company) => company.status === "Active")
  .filter((company) => company.isHiring)
  .filter((company) => matchesTags(company, tags))
  .sort((a, b) => {
    if (a.batch !== b.batch) return String(b.batch).localeCompare(String(a.batch));
    return a.name.localeCompare(b.name);
  })
  .slice(0, limit);

console.log(JSON.stringify(companies.map((company) => ({
  name: company.name,
  ycSlug: company.slug,
  website: company.website ?? "",
  location: company.all_locations ?? "",
  batch: company.batch ?? "",
  industry: company.industry ?? "",
  tags: company.tags ?? [],
  ycUrl: company.url ?? `https://www.ycombinator.com/companies/${company.slug}`,
})), null, 2));

export {};
