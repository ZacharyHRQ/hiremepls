import type { Job } from "./types.ts";

const TG_API = "https://api.telegram.org";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatJob(job: Job): string {
  const title = escapeHtml(job.title);
  const company = escapeHtml(job.company);
  const score = typeof job.score === "number" ? `\n⭐ ${job.score}/100` : "";
  const loc = job.location ? `\n📍 ${escapeHtml(job.location)}` : "";
  const dept = job.department ? `\n🏢 ${escapeHtml(job.department)}` : "";
  return `🆕 <b>${company}</b>\n<a href="${job.url}">${title}</a>${score}${loc}${dept}`;
}

export async function sendJob(
  token: string,
  chatId: string,
  job: Job,
): Promise<void> {
  const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatJob(job),
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`telegram sendMessage failed: ${res.status} ${body}`);
  }
}
