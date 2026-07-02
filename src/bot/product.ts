import { formatJobCard, jobKeyboard } from "../product/format.ts";
import { matchJobs, savedJobs } from "../product/match.ts";
import { loadSnapshot } from "../product/snapshot.ts";
import { ProductStore } from "../product/store.ts";
import { TelegramClient, type TelegramUpdate } from "./telegram.ts";
import { loadDotEnv } from "../env.ts";

const DEFAULT_LIMIT = 5;

function chatIdFromUpdate(update: TelegramUpdate): string | null {
  const id = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  return id === undefined ? null : String(id);
}

function parseLimit(text: string | undefined): number {
  const raw = text?.split(/\s+/)[1];
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(10, parsed));
}

async function sendMatches(
  telegram: TelegramClient,
  store: ProductStore,
  chatId: string,
  limit: number,
): Promise<void> {
  const user = await store.ensureUser(chatId);
  const snapshot = await loadSnapshot();
  const matches = matchJobs(snapshot.jobs, user).slice(0, limit);

  if (matches.length === 0) {
    await telegram.sendMessage(chatId, "No matches above your current score threshold yet.");
    return;
  }

  await telegram.sendMessage(chatId, `Top ${matches.length} matches from the current feed:`);
  for (const job of matches) {
    await telegram.sendMessage(
      chatId,
      formatJobCard(job, snapshot.firstSeen[job.id]),
      jobKeyboard(job),
    );
  }
}

async function sendSaved(
  telegram: TelegramClient,
  store: ProductStore,
  chatId: string,
): Promise<void> {
  const user = await store.ensureUser(chatId);
  const snapshot = await loadSnapshot();
  const jobs = savedJobs(snapshot.jobs, user).slice(0, 10);

  if (jobs.length === 0) {
    await telegram.sendMessage(chatId, "No saved jobs yet. Use Save on a match to build your shortlist.");
    return;
  }

  await telegram.sendMessage(chatId, `Saved jobs (${jobs.length}):`);
  for (const job of jobs) {
    await telegram.sendMessage(
      chatId,
      formatJobCard(job, snapshot.firstSeen[job.id]),
      jobKeyboard(job),
    );
  }
}

async function handleMessage(
  telegram: TelegramClient,
  store: ProductStore,
  update: TelegramUpdate,
): Promise<void> {
  const chatId = chatIdFromUpdate(update);
  if (!chatId) return;
  const text = update.message?.text ?? "";

  if (text.startsWith("/start")) {
    await store.ensureUser(chatId);
    await telegram.sendMessage(
      chatId,
      [
        "Welcome. I will turn the internship feed into a ranked shortlist.",
        "",
        "Use /matches to get your top roles.",
        "Use /saved to review saved jobs.",
        "Each job has Apply, Save, Skip, and Mark applied actions.",
      ].join("\n"),
    );
    await sendMatches(telegram, store, chatId, DEFAULT_LIMIT);
    return;
  }

  if (text.startsWith("/matches")) {
    await sendMatches(telegram, store, chatId, parseLimit(text));
    return;
  }

  if (text.startsWith("/saved")) {
    await sendSaved(telegram, store, chatId);
    return;
  }

  if (text.startsWith("/profile")) {
    const user = await store.ensureUser(chatId);
    await telegram.sendMessage(
      chatId,
      [
        "Profile",
        `Roles: ${user.profile.roles.join(", ") || "any"}`,
        `Locations: ${user.profile.locations.join(", ") || "any"}`,
        `Minimum score: ${user.profile.minScore}`,
      ].join("\n"),
    );
    return;
  }

  await telegram.sendMessage(chatId, "Try /matches, /saved, or /profile.");
}

async function handleCallback(
  telegram: TelegramClient,
  store: ProductStore,
  update: TelegramUpdate,
): Promise<void> {
  const callback = update.callback_query;
  const chatId = chatIdFromUpdate(update);
  if (!callback?.data || !chatId) return;

  const [, action, ...jobIdParts] = callback.data.split(":");
  const jobId = jobIdParts.join(":");
  if (!jobId) return;

  if (action === "save") {
    await store.setJobState(chatId, jobId, "saved");
    await telegram.answerCallbackQuery(callback.id, "Saved");
  } else if (action === "skip") {
    await store.setJobState(chatId, jobId, "skipped");
    await telegram.answerCallbackQuery(callback.id, "Skipped");
  } else if (action === "applied") {
    await store.setJobState(chatId, jobId, "applied");
    await telegram.answerCallbackQuery(callback.id, "Marked applied");
  }
}

async function handleUpdate(
  telegram: TelegramClient,
  store: ProductStore,
  update: TelegramUpdate,
): Promise<void> {
  if (update.callback_query) {
    await handleCallback(telegram, store, update);
    return;
  }
  if (update.message) {
    await handleMessage(telegram, store, update);
  }
}

async function main() {
  await loadDotEnv();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  const telegram = new TelegramClient(token);
  const store = new ProductStore();
  let offset = 0;

  console.log("Telegram product bot polling started.");
  while (true) {
    const updates = await telegram.getUpdates(offset);
    for (const update of updates) {
      offset = update.update_id + 1;
      try {
        await handleUpdate(telegram, store, update);
      } catch (e) {
        console.warn(`update ${update.update_id} failed: ${(e as Error).message}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
