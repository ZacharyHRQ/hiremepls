import type { Job } from "./types.ts";

const INTERN_PATTERNS = [
  /\bintern\b/i,
  /\binternship\b/i,
  /\bsummer\s+(analyst|associate|trader|researcher|engineer)\b/i,
  /\b(graduate|new\s*grad)\b/i,
];

export function isInternship(job: Job): boolean {
  const haystack = `${job.title} ${job.department}`;
  return INTERN_PATTERNS.some((p) => p.test(haystack));
}

const SWE_ROLE_PATTERNS = [
  /\b(software|swe|backend|back[- ]end|frontend|front[- ]end|fullstack|full[- ]stack|infrastructure|platform|devops|sre|systems?|distributed|networks?|security|mobile|ios|android|web|game|gameplay|graphics|firmware|embedded|robotics|controls)\b/i,
  /\b(machine[- ]learning|deep[- ]learning|reinforcement[- ]learning|computer[- ]vision|nlp|natural[- ]language|ml|ai|llm|generative|data|analytics|research)\b/i,
  /\b(quant(itative)?|algorithmic|hft|low[- ]latency)\b/i,
];

const SWE_TITLE_PATTERNS = [
  /\b(engineer|developer|programmer|architect|scientist|researcher|sde|swe)\b/i,
];

const SWE_EXPLICIT_PATTERNS = [
  /\bsoftware\s+(engineer|developer)\b/i,
  /\b(swe|sde)\b/i,
  /\bml\s+engineer\b/i,
  /\bdata\s+(scientist|engineer)\b/i,
  /\b(backend|frontend|fullstack)\b/i,
];

const NON_SWE_PATTERNS = [
  /\b(audit(or|ing)?|actuarial|tax|accounting|finance(\s+intern)?|treasury|controller)\b/i,
  /\b(marketing|communications|pr|public\s+relations|social\s+media|brand|content\s+(creator|writer|strategist)|copywriter|seo)\b/i,
  /\b(sales|business\s+development|bd|account\s+(executive|manager)|customer\s+success|partnerships)\b/i,
  /\b(recruit(er|ing|ment)|talent\s+(acquisition|management)|hr\s+intern|people\s+ops)\b/i,
  /\b(legal|compliance|paralegal|policy)\b/i,
  /\b(supply\s+chain|logistics|procurement|operations\s+(manager|analyst))\b/i,
  /\b(graphic\s+design|ux\s+(designer|writer|writing)|ui\s+(?:designer|writing)|user\s+experience\s+designer|product\s+design(er)?)\b/i,
  /\b(clinical|medical|nursing|pharmac|biolog|chem(ist|istry)|biotech\s+research(er)?)\b/i,
  /\b(mechanical|civil|electrical|chemical|aerospace|industrial)\s+engineer\b/i,
];

export function isSoftwareEngineering(job: Job): boolean {
  const haystack = `${job.title} ${job.department}`.toLowerCase();

  // Hard exclusions
  if (NON_SWE_PATTERNS.some((p) => p.test(haystack))) return false;

  // Explicit hits short-circuit
  if (SWE_EXPLICIT_PATTERNS.some((p) => p.test(haystack))) return true;

  // Otherwise need both a domain term and a role term
  const hasDomain = SWE_ROLE_PATTERNS.some((p) => p.test(haystack));
  const hasRole = SWE_TITLE_PATTERNS.some((p) => p.test(haystack));
  return hasDomain && hasRole;
}

export function parseLocationFilter(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const items = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

export function passesLocation(job: Job, allowed: string[]): boolean {
  if (!job.location) return true; // unknown location — don't filter out
  const loc = job.location.toLowerCase();
  return allowed.some((needle) => loc.includes(needle));
}
