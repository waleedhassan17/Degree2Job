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

// Generic role-type words carry little signal on their own ("developer" matches
// almost any tech job), so they score low. Domain words ("full", "stack",
// "data") are the distinctive part of a role and score high.
const GENERIC_ROLE_WORDS = new Set([
  "developer", "engineer", "officer", "manager", "executive", "analyst",
  "designer", "specialist", "consultant", "associate", "coordinator", "intern",
  "internship", "lead", "senior", "junior", "assistant", "trainee",
  "professional", "expert", "staff", "graduate", "fresh", "jobs", "job", "role",
]);
const ROLE_STOPWORDS = new Set(["and", "or", "the", "for", "with", "of", "in", "to", "a", "an"]);

// Common job-ad modifiers that look like role words but aren't distinctive —
// e.g. "full" (Full Stack) must not match "Full-Time" on a Driver listing.
const COMMON_MODIFIERS = new Set([
  "full", "part", "time", "level", "set", "new", "remote", "onsite", "hybrid",
  "urgent", "based", "team", "online", "work", "home", "entry",
]);

/** Whole-word containment check, so "ai" doesn't match "email", etc. */
function hasWord(text: string, word: string): boolean {
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`, "i").test(text);
}

// Light synonym expansion so related titles still count as relevant.
const ROLE_EXPANSIONS: [RegExp, string[]][] = [
  [/full[\s-]?stack/, ["full stack", "fullstack", "full-stack", "mern", "mean"]],
  [/front[\s-]?end/, ["frontend", "front end", "front-end", "react", "angular", "vue"]],
  [/back[\s-]?end/, ["backend", "back end", "back-end", "node", "django", "laravel", ".net"]],
  [/web\s*develop/, ["web developer", "frontend", "full stack", "wordpress"]],
  [/software\s*(engineer|develop)/, ["software engineer", "software developer", "sde"]],
  [/data\s*analyst/, ["data analyst", "data analytics", "business intelligence", "power bi", "tableau", "sql"]],
  [/data\s*scien/, ["data scientist", "data science", "machine learning", "ml engineer"]],
  [/data\s*engineer/, ["data engineer", "etl", "pipeline", "spark"]],
  [/machine\s*learn|ml\b|\bai\b/, ["machine learning", "ml engineer", "ai engineer", "deep learning"]],
  [/mobile|android|ios|flutter/, ["mobile", "android", "ios", "flutter", "react native"]],
  [/devops|sre|cloud/, ["devops", "sre", "aws", "kubernetes", "docker", "ci/cd", "cloud"]],
  [/ui|ux|product\s*design|graphic/, ["ui", "ux", "figma", "designer", "product design"]],
  [/qa|test|quality/, ["qa", "quality assurance", "test engineer", "sdet", "automation"]],
  [/account|finance|audit/, ["accountant", "finance", "audit", "bookkeep"]],
  [/market|seo|content/, ["marketing", "seo", "content", "digital marketing", "social media"]],
];

function roleTokens(role: string): string[] {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !ROLE_STOPWORDS.has(t));
}

/**
 * How well a job matches the user's preferred role (higher = more relevant).
 * Title hits dominate; body and skill overlap add supporting signal. Used to
 * keep the feed precise — only genuinely relevant roles are shown.
 */
export function roleRelevanceScore(profile: ParsedProfile, job: Job): number {
  const role = (profile.preferredRole || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!role) return 100; // No preferred role → don't filter anything out.

  const title = job.title.toLowerCase();
  const body = `${job.title} ${job.description} ${(job.requirements || []).join(" ")}`.toLowerCase();
  const tokens = roleTokens(role);
  const distinctive = tokens.filter(
    (t) => !GENERIC_ROLE_WORDS.has(t) && !COMMON_MODIFIERS.has(t)
  );
  const expansions = ROLE_EXPANSIONS.filter(([re]) => re.test(role)).flatMap(
    ([, arr]) => arr
  );

  let score = 0;

  // Exact role phrase in the title is the strongest signal.
  if (title.includes(role)) score += 100;

  // Synonym phrase in title / body.
  if (expansions.some((p) => title.includes(p))) score += 50;
  if (expansions.some((p) => body.includes(p))) score += 12;

  // Distinctive role words in the title (strong), generic words (weak).
  for (const t of distinctive) if (hasWord(title, t)) score += 40;
  for (const t of tokens) if (GENERIC_ROLE_WORDS.has(t) && hasWord(title, t)) score += 12;

  // Distinctive words anywhere in the body.
  for (const t of distinctive) if (hasWord(body, t)) score += 8;

  // Skill overlap — helps when the title is generic but the role fits.
  const skillHits = (profile.skills || []).filter((s) => {
    const k = s.toLowerCase();
    return k.length > 2 && body.includes(k);
  }).length;
  score += Math.min(36, skillHits * 9);

  return score;
}

const RELEVANCE_THRESHOLD = 45;
const RELEVANCE_MIN_RESULTS = 6;

/**
 * Keep only jobs relevant to the user's preferred role. If too few clear the
 * bar (niche role / sparse sources), fall back to the best-scoring jobs so the
 * feed is never empty — but precise roles get a precise feed.
 */
export function filterRelevantJobs(jobs: Job[], profile?: ParsedProfile | null): Job[] {
  if (!profile?.preferredRole) return jobs;

  const scored = jobs
    .map((job) => ({ job, score: roleRelevanceScore(profile, job) }))
    .sort((a, b) => b.score - a.score);

  const relevant = scored.filter((x) => x.score >= RELEVANCE_THRESHOLD);
  const chosen =
    relevant.length > 0
      ? relevant
      : scored.slice(0, RELEVANCE_MIN_RESULTS);

  return chosen.map((x) => x.job);
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
