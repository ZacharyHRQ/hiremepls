export type AtsKind = "greenhouse" | "lever" | "ashby";

export interface Company {
  name: string;
  ats: AtsKind;
  slug: string;
}

export interface Job {
  id: string;
  title: string;
  url: string;
  location: string;
  department: string;
  company: string;
}

export type SeenState = Record<string, string[]>;
