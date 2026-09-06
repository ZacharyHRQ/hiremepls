const QUANT_EMPLOYERS = [
  "akuna capital",
  "aqr capital management",
  "citadel",
  "citadel securities",
  "d. e. shaw",
  "deshaw",
  "drw",
  "five rings",
  "flow traders",
  "hudson river trading",
  "imc",
  "jane street",
  "jump trading",
  "millennium",
  "optiver",
  "point72",
  "sig",
  "susquehanna",
  "tower research",
  "two sigma",
  "virtu",
  "xantium",
];

const ROLE_PATTERNS = {
  quant: /\b(quant(?:itative)?|trader|trading|systematic|alpha|market microstructure|hft|low[- ]latency|algorithmic execution|strat(?:egist)?)\b/i,
  ml: /\b(machine learning|deep learning|artificial intelligence|ai|ml|llm|computer vision|natural language|nlp|research scientist)\b/i,
  data: /\b(data|analytics|business intelligence|bi engineer|data scientist)\b/i,
  software: /\b(software|engineer|engineering|developer|swe|sde|backend|frontend|full[- ]stack|infrastructure|platform|systems|security|devops|sre|mobile|ios|android|cloud)\b/i,
};

const QUANT_ROLE_HINT = /\b(quant|trader|trading|research|researcher|developer|engineer|strategist|analyst)\b/i;

export function classifyDesk(job) {
  const text = `${job.company || ""} ${job.title || ""} ${job.department || ""}`;
  const company = (job.company || "").toLowerCase();
  const quantEmployer = QUANT_EMPLOYERS.some(
    (name) => company === name || company.startsWith(`${name} `) || company.endsWith(` ${name}`),
  );
  const nonFinancialResearch = /\b(ux|user experience|consumer insights)\b/i.test(text);

  if ((!nonFinancialResearch && ROLE_PATTERNS.quant.test(text)) || (quantEmployer && QUANT_ROLE_HINT.test(text))) return "quant";
  if (ROLE_PATTERNS.ml.test(text)) return "ml";
  if (ROLE_PATTERNS.data.test(text)) return "data";
  if (ROLE_PATTERNS.software.test(text)) return "software";
  return "other";
}

export function classifyRegion(location = "") {
  const text = location.toLowerCase();
  if (/\b(remote|anywhere|distributed)\b/.test(text)) return "remote";
  if (/\b(usa|united states|u\.s\.|new york|chicago|boston|california|san francisco|seattle|austin|texas|connecticut|illinois|new jersey|washington,? dc)\b/.test(text)) return "us";
  if (/\b(singapore|hong kong|tokyo|japan|india|bengaluru|bangalore|mumbai|taiwan|seoul|china|shanghai|beijing|asia)\b/.test(text)) return "asia";
  if (/\b(uk|united kingdom|london|dublin|ireland|amsterdam|netherlands|paris|france|berlin|munich|germany|zurich|switzerland|europe|emea)\b/.test(text)) return "europe";
  return "other";
}

export function classifyStage(job) {
  const text = `${job.title || ""} ${job.department || ""}`;
  if (/\b(intern|internship|co[- ]?op|summer analyst)\b/i.test(text)) return "internship";
  if (/\b(new grad(?:uate)?|graduate|entry[- ]level|early career|university|campus|associate engineer|junior)\b/i.test(text)) return "graduate";
  return "other";
}

export function firstSeenAt(job, snapshot) {
  const raw = snapshot.firstSeen?.[job.id];
  const timestamp = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function ageInDays(job, snapshot, now = Date.now()) {
  const timestamp = firstSeenAt(job, snapshot);
  return timestamp === null ? null : Math.max(0, (now - timestamp) / 86_400_000);
}

export function filterJobs(jobs, snapshot, filters, now = Date.now()) {
  const query = filters.query.trim().toLowerCase();

  return jobs.filter((job) => {
    if (filters.desk !== "all" && classifyDesk(job) !== filters.desk) return false;
    if (filters.company !== "all" && job.company !== filters.company) return false;
    if (filters.stage !== "all" && classifyStage(job) !== filters.stage) return false;
    if (filters.region !== "all" && classifyRegion(job.location) !== filters.region) return false;
    if (Number(job.score || 0) < filters.minSignal) return false;

    if (filters.window !== "any") {
      const age = ageInDays(job, snapshot, now);
      if (age === null || age > Number(filters.window)) return false;
    }

    if (query) {
      const haystack = `${job.company || ""} ${job.title || ""} ${job.location || ""} ${job.department || ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export function sortJobs(jobs, snapshot, sort) {
  return [...jobs].sort((a, b) => {
    if (sort === "company") {
      return a.company.localeCompare(b.company) || a.title.localeCompare(b.title);
    }
    if (sort === "signal") {
      return Number(b.score || 0) - Number(a.score || 0) || a.company.localeCompare(b.company);
    }
    return (firstSeenAt(b, snapshot) || 0) - (firstSeenAt(a, snapshot) || 0) || Number(b.score || 0) - Number(a.score || 0);
  });
}

export function summarizeDesks(jobs) {
  return jobs.reduce(
    (summary, job) => {
      summary[classifyDesk(job)] += 1;
      return summary;
    },
    { quant: 0, software: 0, ml: 0, data: 0, other: 0 },
  );
}
