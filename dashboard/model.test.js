import { expect, test } from "bun:test";

import { ageInDays, classifyDesk, classifyRegion, classifyStage, filterJobs, sortJobs } from "./model.js";

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
  expect(classifyDesk(jobs[0])).toBe("quant");
  expect(classifyDesk(jobs[1])).toBe("software");
  expect(classifyDesk(jobs[2])).toBe("ml");
  expect(classifyDesk({ company: "Cadence Design Systems", title: "Software Engineer", department: "" })).toBe("software");
  expect(classifyDesk({ company: "Google", title: "UX Quantitative Researcher", department: "" })).toBe("other");
});

test("maps common locations into regions", () => {
  expect(classifyRegion("Remote - US")).toBe("remote");
  expect(classifyRegion("London, UK")).toBe("europe");
  expect(classifyRegion("Singapore")).toBe("asia");
});

test("separates internships, graduate roles, and uncategorized roles", () => {
  expect(classifyStage({ title: "Software Engineer Intern", department: "" })).toBe("internship");
  expect(classifyStage({ title: "Graduate Quantitative Developer", department: "" })).toBe("graduate");
  expect(classifyStage({ title: "Software Engineer", department: "" })).toBe("other");
});

test("combines desk, region, signal, and freshness filters", () => {
  const result = filterJobs(
    jobs,
    snapshot,
    { desk: "quant", company: "Jane Street", stage: "internship", region: "us", minSignal: 90, window: "7", query: "street" },
    Date.parse("2026-09-06T12:00:00.000Z"),
  );
  expect(result.map((job) => job.id)).toEqual(["q1"]);
});

test("excludes undated jobs from bounded freshness windows", () => {
  expect(ageInDays(jobs[2], snapshot)).toBeNull();
  const result = filterJobs(
    jobs,
    snapshot,
    { desk: "all", company: "all", stage: "all", region: "all", minSignal: 0, window: "7", query: "" },
    Date.parse("2026-09-06T12:00:00.000Z"),
  );
  expect(result.map((job) => job.id)).toEqual(["q1"]);
});

test("sorts by score or company without mutating the input", () => {
  expect(sortJobs(jobs, snapshot, "signal").map((job) => job.id)).toEqual(["q1", "m1", "s1"]);
  expect(sortJobs(jobs, snapshot, "company").map((job) => job.company)).toEqual(["Figma", "Jane Street", "OpenAI"]);
  expect(jobs[0].id).toBe("q1");
});
