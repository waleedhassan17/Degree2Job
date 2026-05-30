import type {
  Job,
  JobWithMatch,
  FilterState,
  ParsedProfile,
} from "./types";
import { jobKey } from "./utils";

/** Remove duplicate jobs by title+company, keeping the first (highest-priority source). */
export function dedupeJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const out: Job[] = [];
  for (const job of jobs) {
    const key = jobKey(job.title, job.company);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}

/**
 * Heuristic local pre-score (0–100). Used to rank jobs before the AI
 * match is available, and as a fallback if the AI match fails.
 */
export function heuristicScore(profile: ParsedProfile, job: Job): number {
  let score = 40;
  const haystack = `${job.title} ${job.description} ${job.requirements.join(
    " "
  )}`.toLowerCase();

  // Skill overlap
  const matched = profile.skills.filter((s) =>
    haystack.includes(s.toLowerCase())
  ).length;
  score += Math.min(35, matched * 7);

  // Role keyword
  if (profile.preferredRole) {
    const roleWords = profile.preferredRole.toLowerCase().split(/\s+/);
    if (roleWords.some((w) => w.length > 3 && job.title.toLowerCase().includes(w))) {
      score += 12;
    }
  }

  // City match
  if (
    profile.preferredCity &&
    job.city.toLowerCase().includes(profile.preferredCity.toLowerCase())
  ) {
    score += 8;
  }

  // Level alignment for freshers/interns
  if (
    (profile.experienceLevel === "fresher" || profile.experienceYears < 1) &&
    job.jobType === "internship"
  ) {
    score += 5;
  }

  const experienceText = `${job.experienceRequired || ""} ${job.title} ${job.description}`.toLowerCase();
  if (profile.experienceLevel === "fresher" && /(fresh|intern)/.test(experienceText)) {
    score += 6;
  } else if (profile.experienceLevel === "junior" && /(1\s*year|entry|junior|fresh)/.test(experienceText)) {
    score += 4;
  } else if (profile.experienceLevel === "mid" && /(2\s*year|3\s*year|mid)/.test(experienceText)) {
    score += 3;
  } else if (profile.experienceLevel === "senior" && /(4\s*year|5\s*year|6\s*year|7\s*year|senior|lead|manager)/.test(experienceText)) {
    score += 4;
  }

  return Math.max(0, Math.min(100, score));
}

function postedWithinCutoff(window: FilterState["postedWithin"]): number | null {
  const now = Date.now();
  switch (window) {
    case "24h":
      return now - 24 * 60 * 60 * 1000;
    case "7d":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

/** Apply the full filter state to a job list (pure, client-side safe). */
export function applyFilters(
  jobs: JobWithMatch[],
  filters: FilterState
): JobWithMatch[] {
  const cutoff = postedWithinCutoff(filters.postedWithin);
  const q = filters.query.trim().toLowerCase();

  return jobs.filter((job) => {
    if (filters.city.length && !filters.city.includes(job.city)) {
      // Allow "Remote" jobType to satisfy a Remote city filter.
      if (!(filters.city.includes("Remote") && job.jobType === "remote")) {
        return false;
      }
    }
    if (filters.jobType.length && !filters.jobType.includes(job.jobType)) {
      return false;
    }
    if (filters.source.length && !filters.source.includes(job.source)) {
      return false;
    }
    if (filters.salaryMin && (job.salaryMax ?? job.salaryMin ?? 0) < filters.salaryMin) {
      return false;
    }
    if (filters.salaryMax && (job.salaryMin ?? 0) > filters.salaryMax) {
      return false;
    }
    if (filters.experienceLevel.length) {
      const experienceText = `${job.experienceRequired || ""} ${job.title} ${job.description}`.toLowerCase();
      const inferred: string[] = [];
      if (/(fresh|intern)/.test(experienceText)) inferred.push("fresher");
      if (/(1\s*year|entry|junior)/.test(experienceText)) inferred.push("junior");
      if (/(2\s*year|3\s*year|mid)/.test(experienceText)) inferred.push("mid");
      if (/(4\s*year|5\s*year|6\s*year|7\s*year|senior|lead|manager)/.test(experienceText)) inferred.push("senior");
      if (inferred.length && !filters.experienceLevel.some((level) => inferred.includes(level))) {
        return false;
      }
    }
    if (cutoff && job.postedAt) {
      if (new Date(job.postedAt).getTime() < cutoff) return false;
    }
    if (q) {
      const hay = `${job.title} ${job.company} ${job.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export type SortKey = "match" | "recent" | "salary";

export function sortJobs(jobs: JobWithMatch[], key: SortKey): JobWithMatch[] {
  const copy = [...jobs];
  switch (key) {
    case "recent":
      return copy.sort(
        (a, b) =>
          new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      );
    case "salary":
      return copy.sort(
        (a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0)
      );
    case "match":
    default:
      return copy.sort(
        (a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1)
      );
  }
}
