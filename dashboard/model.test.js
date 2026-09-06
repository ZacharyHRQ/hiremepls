import assert from "node:assert/strict";
import test from "node:test";

import { ageInDays, classifyDesk, classifyRegion, filterJobs, sortJobs } from "./model.js";

const snapshot = {
  firstSeen: {
    q1: "2026-09-05T12:00:00.000Z",
    s1: "2026-08-20T12:00:00.000Z",
  },
};

const jobs = [
  { id: "q1", company: "Jane Street", title: "Software Engineer Intern", department: "", location: "New York, NY", score: 93 },
  { id: "s1", company: "Figma", title: "Software Engineer", department: "Infrastructure", location: "Remote - US", score: 82 },
  { id: "m1", company: "OpenAI", title: "Machine Learning Engineer", department: "", location: "London, UK", score: 88 },
];

test("assigns roles using both employer and title semantics", () => {
  assert.equal(classifyDesk(jobs[0]), "quant");
  assert.equal(classifyDesk(jobs[1]), "software");
  assert.equal(classifyDesk(jobs[2]), "ml");
  assert.equal(classifyDesk({ company: "Cadence Design Systems", title: "Software Engineer", department: "" }), "software");
  assert.equal(classifyDesk({ company: "Google", title: "UX Quantitative Researcher", department: "" }), "other");
});

test("maps common locations into regions", () => {
  assert.equal(classifyRegion("Remote - US"), "remote");
  assert.equal(classifyRegion("London, UK"), "europe");
  assert.equal(classifyRegion("Singapore"), "asia");
});

test("combines desk, region, signal, and freshness filters", () => {
  const result = filterJobs(
    jobs,
    snapshot,
    { desk: "quant", region: "us", minSignal: 90, window: "7", query: "street" },
    Date.parse("2026-09-06T12:00:00.000Z"),
  );
  assert.deepEqual(result.map((job) => job.id), ["q1"]);
});

test("excludes undated jobs from bounded freshness windows", () => {
  assert.equal(ageInDays(jobs[2], snapshot), null);
  const result = filterJobs(
    jobs,
    snapshot,
    { desk: "all", region: "all", minSignal: 0, window: "7", query: "" },
    Date.parse("2026-09-06T12:00:00.000Z"),
  );
  assert.deepEqual(result.map((job) => job.id), ["q1"]);
});

test("sorts by score or company without mutating the input", () => {
  assert.deepEqual(sortJobs(jobs, snapshot, "signal").map((job) => job.id), ["q1", "m1", "s1"]);
  assert.deepEqual(sortJobs(jobs, snapshot, "company").map((job) => job.company), ["Figma", "Jane Street", "OpenAI"]);
  assert.equal(jobs[0].id, "q1");
});
