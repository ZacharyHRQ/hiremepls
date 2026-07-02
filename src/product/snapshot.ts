import { readFile } from "node:fs/promises";
import type { JobsSnapshot } from "../types.ts";

const JOBS_PATH = "jobs.json";

export async function loadSnapshot(): Promise<JobsSnapshot> {
  return JSON.parse(await readFile(JOBS_PATH, "utf8")) as JobsSnapshot;
}
