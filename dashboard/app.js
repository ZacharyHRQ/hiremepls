import { ageInDays, classifyDesk, filterJobs, sortJobs, summarizeDesks } from "./model.js?v=2";

const number = new Intl.NumberFormat("en-US");
const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const pageSize = 50;
const appliedKey = "hiremepls:applied-jobs:v1";
const hiddenCompaniesKey = "hiremepls:hidden-companies:v1";
const appliedDuration = 30 * 24 * 60 * 60 * 1000;

const elements = {
  totalJobs: document.querySelector("#total-jobs"), quantJobs: document.querySelector("#quant-jobs"),
  healthySources: document.querySelector("#healthy-sources"), sourceSummary: document.querySelector("#source-summary"),
  generatedAt: document.querySelector("#generated-at"), search: document.querySelector("#search"),
  company: document.querySelector("#company-filter"), stage: document.querySelector("#stage-filter"),
  window: document.querySelector("#window-filter"), region: document.querySelector("#region-filter"),
  signal: document.querySelector("#signal-filter"), signalValue: document.querySelector("#signal-value"),
  sort: document.querySelector("#sort-filter"), resultCount: document.querySelector("#result-count"),
  list: document.querySelector("#job-list"), loading: document.querySelector("#loading-state"),
  error: document.querySelector("#error-state"), errorCopy: document.querySelector("#error-copy"),
  empty: document.querySelector("#empty-state"), showMore: document.querySelector("#show-more"),
  activityCount: document.querySelector("#activity-count"), activityDialog: document.querySelector("#activity-dialog"),
  activityList: document.querySelector("#activity-list"), restoreAll: document.querySelector("#restore-all"),
  toast: document.querySelector("#activity-toast"), toastCopy: document.querySelector("#activity-toast-copy"),
};

const state = {
  snapshot: null, visible: pageSize, filters: readFilters(), appliedJobs: loadTimedMap(appliedKey),
  hiddenCompanies: loadSet(hiddenCompaniesKey), undo: null, toastTimer: null,
};

function loadSet(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
  } catch { return new Set(); }
}

function loadTimedMap(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const cutoff = Date.now() - appliedDuration;
    return new Map(Object.entries(stored).filter(([, timestamp]) => Number(timestamp) >= cutoff));
  } catch { return new Map(); }
}

function saveActivity() {
  try {
    localStorage.setItem(appliedKey, JSON.stringify(Object.fromEntries(state.appliedJobs)));
    localStorage.setItem(hiddenCompaniesKey, JSON.stringify([...state.hiddenCompanies]));
  } catch { /* The in-memory state still works when storage is unavailable. */ }
}

function readFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    desk: params.get("desk") || "quant", query: params.get("q") || "", company: params.get("company") || "all",
    stage: params.get("stage") || "all", window: params.get("window") || "any", region: params.get("region") || "all",
    minSignal: Number(params.get("signal") || 70), sort: params.get("sort") || "recent",
  };
}

function writeFilters() {
  const params = new URLSearchParams();
  if (state.filters.desk !== "quant") params.set("desk", state.filters.desk);
  if (state.filters.query) params.set("q", state.filters.query);
  if (state.filters.company !== "all") params.set("company", state.filters.company);
  if (state.filters.stage !== "all") params.set("stage", state.filters.stage);
  if (state.filters.window !== "any") params.set("window", state.filters.window);
  if (state.filters.region !== "all") params.set("region", state.filters.region);
  if (state.filters.minSignal !== 70) params.set("signal", String(state.filters.minSignal));
  if (state.filters.sort !== "recent") params.set("sort", state.filters.sort);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

function applyFiltersToControls() {
  const desk = document.querySelector(`input[name="desk"][value="${CSS.escape(state.filters.desk)}"]`);
  if (desk) desk.checked = true;
  elements.search.value = state.filters.query;
  elements.company.value = state.filters.company;
  elements.stage.value = state.filters.stage;
  elements.window.value = state.filters.window;
  elements.region.value = state.filters.region;
  elements.signal.value = String(state.filters.minSignal);
  elements.signalValue.value = String(state.filters.minSignal);
  elements.sort.value = state.filters.sort;
}

function resetFilters() {
  state.filters = { desk: "quant", query: "", company: "all", stage: "all", window: "any", region: "all", minSignal: 70, sort: "recent" };
  state.visible = pageSize;
  applyFiltersToControls();
  render();
}

function formatAge(job) {
  const age = ageInDays(job, state.snapshot);
  if (age === null) return "date unknown";
  if (age < 1) return "today";
  if (age < 7) return relativeTime.format(-Math.floor(age), "day");
  if (age < 35) return `${Math.floor(age / 7)}w ago`;
  return `${Math.floor(age / 30)}mo ago`;
}

function makeButton(label, className, action) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = className;
  control.textContent = label;
  control.addEventListener("click", action);
  return control;
}

function showToast(copy, undo) {
  window.clearTimeout(state.toastTimer);
  state.undo = undo;
  elements.toastCopy.textContent = copy;
  elements.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => { elements.toast.hidden = true; state.undo = null; }, 7000);
}

function markApplied(job) {
  state.appliedJobs.set(job.id, Date.now());
  saveActivity();
  showToast(`Marked ${job.company} as applied.`, () => state.appliedJobs.delete(job.id));
  render();
}

function hideCompany(job) {
  state.hiddenCompanies.add(job.company);
  saveActivity();
  showToast(`Hidden ${job.company}.`, () => state.hiddenCompanies.delete(job.company));
  render();
}

function jobRow(job) {
  const item = document.createElement("li");
  const article = document.createElement("article");
  const link = document.createElement("a");
  link.className = "job-open";
  link.href = job.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", `${job.title} at ${job.company}, opens application in a new tab`);
  const company = document.createElement("span");
  company.className = "job-company";
  company.textContent = job.company;
  const main = document.createElement("span");
  main.className = "job-main";
  const title = document.createElement("strong");
  title.textContent = job.title;
  const meta = document.createElement("small");
  meta.textContent = [job.location || "Location unknown", job.department].filter(Boolean).join(" / ");
  main.append(title, meta);
  const desk = document.createElement("span");
  desk.className = "job-desk";
  desk.textContent = classifyDesk(job);
  const age = document.createElement("time");
  age.className = "job-age";
  age.textContent = formatAge(job);
  const score = document.createElement("span");
  score.className = "job-score";
  const scoreLabel = document.createElement("small");
  scoreLabel.textContent = "signal";
  const scoreValue = document.createElement("strong");
  scoreValue.textContent = String(Number(job.score || 0));
  score.append(scoreLabel, scoreValue);
  link.append(company, main, desk, age, score);
  const actions = document.createElement("span");
  actions.className = "job-actions";
  actions.append(makeButton("Mark applied", "job-action primary", () => markApplied(job)), makeButton("Hide company", "job-action", () => hideCompany(job)));
  article.append(link, actions);
  item.append(article);
  return item;
}

function activityRow(primary, secondary, restore) {
  const row = document.createElement("div");
  const copy = document.createElement("span");
  const strong = document.createElement("strong");
  strong.textContent = primary;
  const small = document.createElement("small");
  small.textContent = secondary;
  copy.append(strong, small);
  row.append(copy, makeButton("Restore", "restore-item", restore));
  return row;
}

function updateActivity() {
  const total = state.appliedJobs.size + state.hiddenCompanies.size;
  elements.activityCount.textContent = number.format(total);
  elements.restoreAll.disabled = total === 0;
  const rows = [];
  for (const company of [...state.hiddenCompanies].sort()) {
    rows.push(activityRow(company, "Company hidden", () => {
      state.hiddenCompanies.delete(company); saveActivity(); updateActivity(); render();
    }));
  }
  for (const [id] of state.appliedJobs) {
    const job = state.snapshot?.jobs.find((candidate) => candidate.id === id);
    if (!job) continue;
    rows.push(activityRow(job.title, `${job.company} / Applied`, () => {
      state.appliedJobs.delete(id); saveActivity(); updateActivity(); render();
    }));
  }
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "activity-empty";
    empty.textContent = "Nothing is hidden yet.";
    rows.push(empty);
  }
  elements.activityList.replaceChildren(...rows);
}

function render() {
  if (!state.snapshot) return;
  const filtered = filterJobs(state.snapshot.jobs, state.snapshot, state.filters)
    .filter((job) => !state.appliedJobs.has(job.id) && !state.hiddenCompanies.has(job.company));
  const sorted = sortJobs(filtered, state.snapshot, state.filters.sort);
  const visible = sorted.slice(0, state.visible);
  elements.resultCount.textContent = number.format(sorted.length);
  elements.list.replaceChildren(...visible.map(jobRow));
  elements.empty.hidden = sorted.length !== 0;
  elements.list.hidden = sorted.length === 0;
  elements.showMore.hidden = visible.length >= sorted.length;
  elements.showMore.textContent = `Show ${Math.min(pageSize, sorted.length - visible.length)} more`;
  updateActivity();
  writeFilters();
}

function populateSummary() {
  const snapshot = state.snapshot;
  const desks = summarizeDesks(snapshot.jobs);
  elements.totalJobs.textContent = number.format(snapshot.jobCount);
  elements.quantJobs.textContent = number.format(desks.quant);
  elements.healthySources.textContent = `${number.format(snapshot.okCount)} / ${number.format(snapshot.companyCount)}`;
  elements.sourceSummary.textContent = snapshot.errors.length ? `${snapshot.errors.length} sources retrying` : "All sources checked";
  const generated = new Date(snapshot.generatedAt);
  elements.generatedAt.dateTime = snapshot.generatedAt;
  elements.generatedAt.textContent = Number.isNaN(generated.getTime()) ? "" : generated.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const companies = [...new Set(snapshot.jobs.map((job) => job.company))].sort((a, b) => a.localeCompare(b));
  elements.company.append(...companies.map((company) => new Option(company, company)));
  document.querySelector("#count-all").textContent = number.format(snapshot.jobs.length);
  document.querySelector("#count-quant").textContent = number.format(desks.quant);
  document.querySelector("#count-software").textContent = number.format(desks.software);
  document.querySelector("#count-ml").textContent = number.format(desks.ml);
  document.querySelector("#count-data").textContent = number.format(desks.data);
  applyFiltersToControls();
}

async function loadSnapshot() {
  elements.loading.hidden = false;
  elements.error.hidden = true;
  elements.empty.hidden = true;
  elements.list.hidden = true;
  elements.showMore.hidden = true;
  try {
    const response = await fetch("../jobs.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Snapshot request returned ${response.status}`);
    const snapshot = await response.json();
    if (!Array.isArray(snapshot.jobs) || !snapshot.firstSeen) throw new Error("Snapshot shape is invalid");
    state.snapshot = snapshot;
    elements.loading.hidden = true;
    elements.list.hidden = false;
    populateSummary();
    render();
  } catch (error) {
    elements.loading.hidden = true;
    elements.error.hidden = false;
    elements.errorCopy.textContent = error instanceof Error ? error.message : "The job data could not be loaded.";
  }
}

document.querySelectorAll('input[name="desk"]').forEach((control) => control.addEventListener("change", () => {
  state.filters.desk = control.value; state.visible = pageSize; render();
}));
elements.search.addEventListener("input", () => { state.filters.query = elements.search.value.trim(); state.visible = pageSize; render(); });
for (const [element, key] of [[elements.company, "company"], [elements.stage, "stage"], [elements.window, "window"], [elements.region, "region"], [elements.sort, "sort"]]) {
  element.addEventListener("change", () => { state.filters[key] = element.value; state.visible = pageSize; render(); });
}
elements.signal.addEventListener("input", () => {
  state.filters.minSignal = Number(elements.signal.value); elements.signalValue.value = elements.signal.value; state.visible = pageSize; render();
});
elements.showMore.addEventListener("click", () => { state.visible += pageSize; render(); });
document.querySelector("#reset-filters").addEventListener("click", resetFilters);
document.querySelector("#empty-reset").addEventListener("click", resetFilters);
document.querySelector("#retry").addEventListener("click", loadSnapshot);
document.querySelector("#review-activity").addEventListener("click", () => elements.activityDialog.showModal());
document.querySelector("#close-activity").addEventListener("click", () => elements.activityDialog.close());
elements.restoreAll.addEventListener("click", () => {
  state.appliedJobs.clear(); state.hiddenCompanies.clear(); saveActivity(); updateActivity(); render();
});
document.querySelector("#undo-activity").addEventListener("click", () => {
  state.undo?.(); state.undo = null; elements.toast.hidden = true; saveActivity(); render();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.search) { event.preventDefault(); elements.search.focus(); }
});

applyFiltersToControls();
loadSnapshot();
