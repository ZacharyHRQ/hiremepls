export type AtsKind =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "simplify"
  | "vanshb03"
  | "githubMarkdown"
  | "githubJson"
  | "smartrecruiters"
  | "workable";

export interface Company {
  name: string;
  ats: AtsKind;
  slug: string;
  cluster?: string;
  site?: string;
  sourceUrl?: string;
}

export interface Job {
  id: string;
  title: string;
  url: string;
  location: string;
  department: string;
  company: string;
  score?: number;
  scoreReasons?: string[];
}

export type SeenState = Record<string, string[]>;

export interface SnapshotError {
  company: string;
  message: string;
}

export interface JobsSnapshot {
  generatedAt: string;
  companyCount: number;
  okCount: number;
  jobCount: number;
  firstSeen: Record<string, string>;
  jobs: Job[];
  errors: SnapshotError[];
}
