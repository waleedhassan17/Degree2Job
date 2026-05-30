import type { Job, JobMatch, JobType, JobSource } from "./types";

/** Map a domain Job to a Supabase `jobs` row for upsert. */
export function jobToRow(job: Job) {
  return {
    external_id: job.externalId ?? null,
    title: job.title,
    company: job.company,
    location: job.location ?? null,
    city: job.city ?? null,
    salary_min: job.salaryMin ?? null,
    salary_max: job.salaryMax ?? null,
    salary_currency: job.salaryCurrency ?? "PKR",
    job_type: job.jobType,
    experience_required: job.experienceRequired ?? null,
    description: job.description ?? "",
    requirements: job.requirements ?? [],
    source: job.source,
    apply_url: job.applyUrl,
    posted_at: job.postedAt ?? null,
    is_active: true,
  };
}

/** Map a Supabase `jobs` row back to a domain Job. */
export function rowToJob(row: any): Job {
  return {
    id: row.id,
    externalId: row.external_id ?? undefined,
    title: row.title,
    company: row.company,
    location: row.location ?? "",
    city: row.city ?? "",
    salaryMin: row.salary_min ?? undefined,
    salaryMax: row.salary_max ?? undefined,
    salaryCurrency: row.salary_currency ?? "PKR",
    jobType: (row.job_type as JobType) ?? "full-time",
    experienceRequired: row.experience_required ?? undefined,
    description: row.description ?? "",
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
    source: (row.source as JobSource) ?? "rozee",
    applyUrl: row.apply_url ?? "",
    postedAt: row.posted_at ?? row.fetched_at ?? new Date().toISOString(),
    fetchedAt: row.fetched_at ?? new Date().toISOString(),
  };
}

/** Map a Supabase `job_matches` row to a domain JobMatch. */
export function rowToMatch(row: any): JobMatch {
  return {
    jobId: row.job_id,
    score: row.score ?? 0,
    verdict: row.verdict ?? "fair",
    matchReasons: Array.isArray(row.match_reasons) ? row.match_reasons : [],
    missingSkills: Array.isArray(row.missing_skills) ? row.missing_skills : [],
    highlight: row.highlight ?? "",
  };
}
