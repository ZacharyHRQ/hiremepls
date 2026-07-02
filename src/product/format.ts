import type { Job } from "../types.ts";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatJobCard(job: Job, firstSeen?: string): string {
  const score = typeof job.score === "number" ? `\nMatch: <b>${job.score}/100</b>` : "";
  const loc = job.location ? `\nLocation: ${escapeHtml(job.location)}` : "";
  const dept = job.department ? `\nTeam: ${escapeHtml(job.department)}` : "";
  const seen = firstSeen ? `\nFirst seen: ${escapeHtml(firstSeen.slice(0, 10))}` : "";
  const reasons = job.scoreReasons?.length
    ? `\nWhy: ${escapeHtml(job.scoreReasons.slice(0, 3).join(", "))}`
    : "";

  return [
    `<b>${escapeHtml(job.company)}</b>`,
    `<a href="${job.url}">${escapeHtml(job.title)}</a>`,
    `${score}${loc}${dept}${seen}${reasons}`,
  ].join("\n");
}

export function jobKeyboard(job: Job): object {
  return {
    inline_keyboard: [
      [
        { text: "Apply", url: job.url },
        { text: "Save", callback_data: `job:save:${job.id}` },
        { text: "Skip", callback_data: `job:skip:${job.id}` },
      ],
      [{ text: "Mark applied", callback_data: `job:applied:${job.id}` }],
    ],
  };
}
