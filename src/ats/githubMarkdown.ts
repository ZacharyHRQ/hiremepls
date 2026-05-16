import { createHash } from "node:crypto";
import type { Company, Job } from "../types.ts";

interface MarkdownListing {
  company: string;
  title: string;
  location: string;
  url: string;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*/g, "")
    .replace(/&amp;/g, "&")
    .trim();
}

function parseLink(value: string): string {
  const markdown = value.match(/\[[^\]]+\]\(([^)]+)\)/);
  if (markdown?.[1]) return markdown[1].trim();

  const html = value.match(/href=["']([^"']+)["']/i);
  if (html?.[1]) return html[1].trim();

  const bare = value.match(/https?:\/\/\S+/);
  return bare?.[0]?.replace(/[)>.,]+$/, "") ?? "";
}

function splitMarkdownRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isDividerRow(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function getCell(
  row: Record<string, string>,
  names: string[],
): string {
  for (const name of names) {
    const value = row[name.toLowerCase()];
    if (value) return value;
  }
  return "";
}

function parseMarkdownListings(markdown: string): MarkdownListing[] {
  const rows: MarkdownListing[] = [];
  let headers: string[] | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;

    const cells = splitMarkdownRow(line);
    if (cells.length < 3) continue;

    if (!headers) {
      headers = cells.map((cell) => stripMarkdown(cell).toLowerCase());
      continue;
    }

    if (isDividerRow(cells)) continue;
    if (cells.length !== headers.length) continue;

    const row = Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""]));
    const company = stripMarkdown(getCell(row, ["company", "company name"]));
    const title = stripMarkdown(getCell(row, ["role", "title", "position", "job"]));
    const location = stripMarkdown(getCell(row, ["location", "locations"]));
    const url = parseLink(getCell(row, ["link", "apply", "application"]));

    if (!company || !title || !url.startsWith("http")) continue;
    rows.push({ company, title, location, url });
  }

  return rows;
}

export async function fetchGithubMarkdown(company: Company): Promise<Job[]> {
  if (!company.sourceUrl) {
    throw new Error(`githubMarkdown ${company.name}: missing sourceUrl`);
  }

  const res = await fetch(company.sourceUrl, {
    headers: { "User-Agent": "hireme-bot" },
  });
  if (!res.ok) {
    throw new Error(`githubMarkdown ${company.name}: HTTP ${res.status}`);
  }

  const listings = parseMarkdownListings(await res.text());
  return listings.map((listing) => {
    const hash = createHash("sha1")
      .update(`${company.slug}:${listing.company}:${listing.title}:${listing.url}`)
      .digest("hex")
      .slice(0, 12);

    return {
      id: `github-md:${company.slug}:${hash}`,
      title: listing.title,
      url: listing.url,
      location: listing.location,
      department: "",
      company: listing.company,
    };
  });
}
