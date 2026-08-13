import type { Company, Job } from "../types.ts";

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decodeXmlEntities(m[1].trim()) : "";
}

// Personio's XML feed nests a second <name> tag inside <jobDescriptions> (e.g. "Your
// mission"), so only the head of each <position> block (before descriptions start)
// is safe to scan for the position's own id/title/office/department.
export async function fetchPersonio(company: Company): Promise<Job[]> {
  const url = company.sourceUrl ?? `https://${company.slug}.jobs.personio.de/xml?language=en`;
  const res = await fetch(url, { headers: { "User-Agent": "hireme-bot" } });
  if (!res.ok) {
    throw new Error(`personio ${company.slug}: HTTP ${res.status}`);
  }
  const xml = await res.text();
  const blocks = xml
    .split("<position>")
    .slice(1)
    .map((b) => b.split("</position>")[0].split("<jobDescriptions>")[0]);

  return blocks
    .filter((head) => extractTag(head, "id") && extractTag(head, "name"))
    .map((head) => {
      const id = extractTag(head, "id");
      return {
        id: `personio:${company.slug}:${id}`,
        title: extractTag(head, "name"),
        url: `https://${company.slug}.jobs.personio.de/job/${id}`,
        location: extractTag(head, "office"),
        department: extractTag(head, "department") || extractTag(head, "recruitingCategory"),
        company: company.name,
      };
    });
}
