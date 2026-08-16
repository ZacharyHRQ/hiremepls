# hireme

An automated internship discovery pipeline. It polls 180+ company career pages across 14 different ATS platforms every 15 minutes, filters and ranks the results for software engineering internships, deduplicates cross-posted listings, and pushes new matches to Telegram — all running unattended on GitHub Actions.

I built this because manually checking dozens of companies' career pages for internship postings doesn't scale. This does it for me, continuously, for free.

## How it works

```
companies.json ──▶ ATS fetchers ──▶ filter ──▶ dedupe ──▶ score/rank ──▶ notify + snapshot
```

1. **Fetch** — `companies.json` lists ~186 companies, each tagged with an ATS type (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable, Recruitee, Personio, Amazon's internal board, Rippling/Algolia-backed boards, and a few GitHub-hosted markdown/JSON internship lists). A dedicated fetcher module per ATS in `src/ats/` normalizes each source into a common `Job` shape.
2. **Filter** — regex-based classifiers (`src/filter.ts`) identify internship/new-grad postings and, optionally, narrow to software-engineering-flavored roles (`SWE_ONLY=true`), with an explicit exclusion list for adjacent-but-irrelevant departments (sales, legal, marketing, etc.). An optional location filter can also be applied.
3. **Dedupe** — `src/dedupe.ts` collapses duplicate postings that appear across multiple sources (e.g. a Greenhouse listing also mirrored on a GitHub-curated list) by normalizing company/title/location into a canonical hash and by stripping tracking params from URLs, merging metadata from whichever copy is more complete.
4. **Score & rank** — `src/rank.ts` assigns a 0–100 relevance score based on role signal strength, source trustworthiness (direct ATS links outrank third-party aggregators), and recency signals like "new grad," so the most relevant roles surface first.
5. **Notify** — new postings (since the last run) are pushed to one or more Telegram chats via the Bot API, formatted with title, company, score, location, and department.
6. **Snapshot** — every run writes `jobs.json` (structured snapshot), `JOBS.md` (human-readable digest), `seen.json` (per-company dedupe state), and `health.json` (per-source failure tracking), which are committed straight back to the repo by the CI workflow.

## Reliability features

- **Per-source failure isolation** — if one company's ATS is down or has changed its API, that source is skipped and logged without failing the whole run.
- **Flap-tolerant alerting** — a source has to fail 3 consecutive runs (~45 min) before triggering a "this source is broken" Telegram alert, and it only re-alerts if the source heals and breaks again.
- **Dry-run mode** — running without Telegram credentials configured automatically falls back to a dry run that logs what would have been sent, instead of erroring out.
- **First-run seeding** — on a fresh `seen.json`, the run seeds state without spamming notifications for the entire existing backlog.

## Tech stack

- **TypeScript** (strict, ESM, run directly via [`tsx`](https://github.com/privatenumber/tsx) — no build step)
- **Node.js 20+**
- Zero runtime dependencies — just the `fetch` API and the Telegram Bot HTTP API
- **GitHub Actions** as the scheduler/host (`*/15 * * * *` cron), with the workflow committing its own output back to the repo

## Project layout

```
src/
  ats/            One fetcher module per ATS integration (Greenhouse, Lever, Ashby, Workday, ...)
  filter.ts        Internship / SWE-role classification
  dedupe.ts        Cross-source duplicate detection & merging
  rank.ts          Relevance scoring
  notifier.ts       Telegram delivery
  render/markdown.ts  Human-readable JOBS.md generation
  index.ts         Orchestrates a full run
  list.ts          CLI to inspect the current snapshot
scripts/
  discover-yc.ts   Helper to bulk-discover Y Combinator company career pages
  get-chat-id.ts   Helper to resolve a Telegram chat ID for setup
companies.json     The tracked company list (~186 companies)
```

## Running it

```bash
npm install
cp .env.example .env   # add TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID, or omit for dry-run
npm run check           # one full run: fetch, filter, rank, notify, snapshot
npm run list             # inspect the current jobs.json snapshot from the CLI
```

Environment variables:

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram delivery (comma-separated chat IDs supported); omitted → dry-run |
| `SWE_ONLY` | `true` to restrict results to software-engineering-flavored roles |
| `LOCATION_FILTER` | comma-separated location substrings to filter on |

In production this runs on a schedule via [`.github/workflows/check.yml`](.github/workflows/check.yml), with no server to maintain.
