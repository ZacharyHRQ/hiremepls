import { ageInDays, classifyDesk, filterJobs, sortJobs, summarizeDesks } from "./model.js?v=1";

const number = new Intl.NumberFormat("en-US");
const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const pageSize = 50;

const elements = {
  totalJobs: document.querySelector("#total-jobs"),
  quantJobs: document.querySelector("#quant-jobs"),
  healthySources: document.querySelector("#healthy-sources"),
  sourceSummary: document.querySelector("#source-summary"),
  generatedAt: document.querySelector("#generated-at"),
  search: document.querySelector("#search"),
  window: document.querySelector("#window-filter"),
  region: document.querySelector("#region-filter"),
  signal: document.querySelector("#signal-filter"),
  signalValue: document.querySelector("#signal-value"),
  sort: document.querySelector("#sort-filter"),
  resultCount: document.querySelector("#result-count"),
  list: document.querySelector("#job-list"),
  loading: document.querySelector("#loading-state"),
  error: document.querySelector("#error-state"),
  errorCopy: document.querySelector("#error-copy"),
  empty: document.querySelector("#empty-state"),
  showMore: document.querySelector("#show-more"),
};

const state = {
  snapshot: null,
  visible: pageSize,
  filters: readFilters(),
};

function readFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    desk: params.get("desk") || "quant",
    query: params.get("q") || "",
    window: params.get("window") || "any",
    region: params.get("region") || "all",
    minSignal: Number(params.get("signal") || 70),
    sort: params.get("sort") || "recent",
  };
}

function writeFilters() {
  const params = new URLSearchParams();
  if (state.filters.desk !== "quant") params.set("desk", state.filters.desk);
  if (state.filters.query) params.set("q", state.filters.query);
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
  elements.window.value = state.filters.window;
  elements.region.value = state.filters.region;
  elements.signal.value = String(state.filters.minSignal);
  elements.signalValue.value = String(state.filters.minSignal);
  elements.sort.value = state.filters.sort;
}

function resetFilters() {
  state.filters = { desk: "quant", query: "", window: "any", region: "all", minSignal: 70, sort: "recent" };
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

function jobRow(job) {
  const item = document.createElement("li");
  const link = document.createElement("a");
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
  score.innerHTML = `<small>signal</small><strong>${Number(job.score || 0)}</strong>`;

  const arrow = document.createElement("span");
  arrow.className = "job-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";

  link.append(company, main, desk, age, score, arrow);
  item.append(link);
  return item;
}

function render() {
  if (!state.snapshot) return;
  const filtered = filterJobs(state.snapshot.jobs, state.snapshot, state.filters);
  const sorted = sortJobs(filtered, state.snapshot, state.filters.sort);
  const visible = sorted.slice(0, state.visible);

  elements.resultCount.textContent = number.format(sorted.length);
  elements.list.replaceChildren(...visible.map(jobRow));
  elements.empty.hidden = sorted.length !== 0;
  elements.list.hidden = sorted.length === 0;
  elements.showMore.hidden = visible.length >= sorted.length;
  elements.showMore.textContent = `Show ${Math.min(pageSize, sorted.length - visible.length)} more`;
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

  document.querySelector("#count-all").textContent = number.format(snapshot.jobs.length);
  document.querySelector("#count-quant").textContent = number.format(desks.quant);
  document.querySelector("#count-software").textContent = number.format(desks.software);
  document.querySelector("#count-ml").textContent = number.format(desks.ml);
  document.querySelector("#count-data").textContent = number.format(desks.data);
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

document.querySelectorAll('input[name="desk"]').forEach((control) => {
  control.addEventListener("change", () => {
    state.filters.desk = control.value;
    state.visible = pageSize;
    render();
  });
});

elements.search.addEventListener("input", () => {
  state.filters.query = elements.search.value.trim();
  state.visible = pageSize;
  render();
});

for (const [element, key] of [[elements.window, "window"], [elements.region, "region"], [elements.sort, "sort"]]) {
  element.addEventListener("change", () => {
    state.filters[key] = element.value;
    state.visible = pageSize;
    render();
  });
}

elements.signal.addEventListener("input", () => {
  state.filters.minSignal = Number(elements.signal.value);
  elements.signalValue.value = elements.signal.value;
  state.visible = pageSize;
  render();
});

elements.showMore.addEventListener("click", () => {
  state.visible += pageSize;
  render();
});

document.querySelector("#reset-filters").addEventListener("click", resetFilters);
document.querySelector("#empty-reset").addEventListener("click", resetFilters);
document.querySelector("#retry").addEventListener("click", loadSnapshot);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.search) {
    event.preventDefault();
    elements.search.focus();
  }
});

applyFiltersToControls();
loadSnapshot();
