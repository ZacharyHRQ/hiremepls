import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { JobState, ProductState, UserRecord } from "./types.ts";

const DEFAULT_PATH = "data/product-state.json";

function now(): string {
  return new Date().toISOString();
}

function emptyState(): ProductState {
  return { users: {} };
}

export class ProductStore {
  constructor(private readonly path = process.env.PRODUCT_STATE_PATH ?? DEFAULT_PATH) {}

  async load(): Promise<ProductState> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as ProductState;
    } catch {
      return emptyState();
    }
  }

  async save(state: ProductState): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(state, null, 2) + "\n");
  }

  async ensureUser(chatId: string): Promise<UserRecord> {
    const state = await this.load();
    const existing = state.users[chatId];
    if (existing) return existing;

    const ts = now();
    const record: UserRecord = {
      profile: {
        chatId,
        roles: ["software", "data", "ml", "quant"],
        locations: [],
        minScore: 70,
        createdAt: ts,
        updatedAt: ts,
      },
      jobs: {},
    };
    state.users[chatId] = record;
    await this.save(state);
    return record;
  }

  async setJobState(chatId: string, jobId: string, jobState: JobState): Promise<UserRecord> {
    const state = await this.load();
    const user = state.users[chatId] ?? (await this.ensureUser(chatId));
    user.jobs[jobId] = { state: jobState, updatedAt: now() };
    user.profile.updatedAt = now();
    state.users[chatId] = user;
    await this.save(state);
    return user;
  }
}
