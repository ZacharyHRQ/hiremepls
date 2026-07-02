export type JobState = "saved" | "skipped" | "applied";

export interface UserProfile {
  chatId: string;
  roles: string[];
  locations: string[];
  minScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserJobRecord {
  state: JobState;
  updatedAt: string;
}

export interface UserRecord {
  profile: UserProfile;
  jobs: Record<string, UserJobRecord>;
}

export interface ProductState {
  users: Record<string, UserRecord>;
}
