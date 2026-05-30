// ─────────────────────────────────────────────
// Shared domain types for JobPulse PK
// ─────────────────────────────────────────────

export type ExperienceLevel = "fresher" | "junior" | "mid" | "senior";

export type JobSource =
  | "rozee"
  | "mustakbil"
  | "nts"
  | "fpsc"
  | "jsearch"
  | "remoteok"
  | "themuse";

export type JobType =
  | "full-time"
  | "part-time"
  | "internship"
  | "contract"
  | "remote"
  | "hybrid";

export type Verdict = "excellent" | "good" | "fair" | "poor";

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface ParsedProfile {
  name: string;
  email?: string;
  phone?: string;
  degree: string;
  university: string;
  graduationYear?: number;
  skills: string[];
  experienceYears: number;
  preferredRole: string;
  preferredCity: string;
  experienceLevel: ExperienceLevel;
  summary: string;
}

export interface Job {
  id: string;
  externalId?: string;
  title: string;
  company: string;
  location: string;
  city: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  jobType: JobType;
  experienceRequired?: string;
  description: string;
  requirements: string[];
  source: JobSource;
  applyUrl: string;
  postedAt: string;
  fetchedAt: string;
}

export interface JobMatch {
  jobId: string;
  score: number;
  verdict: Verdict;
  matchReasons: string[];
  missingSkills: string[];
  highlight: string;
}

export interface JobWithMatch extends Job {
  match?: JobMatch;
  isSaved?: boolean;
  applicationStatus?: ApplicationStatus;
}

export interface SavedJob {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  notes?: string;
  appliedAt?: string;
  createdAt: string;
  job?: Job;
}

export interface FilterState {
  city: string[];
  jobType: string[];
  experienceLevel: string[];
  source: string[];
  salaryMin?: number;
  salaryMax?: number;
  postedWithin: "24h" | "7d" | "30d" | "all";
  query: string;
}

export interface SourceBreakdown {
  source: JobSource;
  count: number;
  status: "ok" | "unavailable";
}

export interface FetchJobsResponse {
  jobs: Job[];
  totalCount: number;
  sourceBreakdown: SourceBreakdown[];
}

export interface ApiError {
  error: string;
  code?: string;
}
