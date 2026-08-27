import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Company, Job } from "../types.ts";

const execFileAsync = promisify(execFile);

// `bun` is on PATH in CI (via oven-sh/setup-bun) but on a dev machine it's
// often only a lazy-loaded shell function (fnm/mise-style shims), which is
// invisible to a non-interactive execFile() spawn. Fall back to the default
// install location before giving up.
function resolveBunPath(): string {
  if (process.env.BUN_PATH) return process.env.BUN_PATH;
  const fallback = join(homedir(), ".bun", "bin", "bun");
  return existsSync(fallback) ? fallback : "bun";
}

// Companies whose career sites are client-rendered SPAs with no public JSON
// API (Google, Meta, Apple, ...) get scraped via a real headless browser
// instead of fetch(). Bun.WebView only exists inside a Bun process, so each
// one is a standalone `bun` script in scripts/webview/ keyed by slug, run as
// a subprocess and expected to print a JSON Job[] array to stdout.
export async function fetchWebview(company: Company): Promise<Job[]> {
  const scriptPath = new URL(`../../scripts/webview/${company.slug}.ts`, import.meta.url).pathname;

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(resolveBunPath(), ["run", scriptPath], {
      maxBuffer: 32 * 1024 * 1024,
    }));
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    throw new Error(`webview ${company.slug}: ${err.stderr?.trim() || err.message}`);
  }

  return JSON.parse(stdout) as Job[];
}
