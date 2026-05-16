const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN first.");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const data = (await res.json()) as {
  result: { message?: { chat: { id: number; type: string; title?: string; username?: string } } }[];
};

const chats = new Map<number, string>();
for (const u of data.result) {
  const c = u.message?.chat;
  if (c) chats.set(c.id, `${c.type} — ${c.title ?? c.username ?? "(direct)"}`);
}

if (chats.size === 0) {
  console.log("No chats yet. Send any message to your bot, then re-run.");
} else {
  for (const [id, label] of chats) console.log(`${id}\t${label}`);
}

export {};
