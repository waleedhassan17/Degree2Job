import type { Job, JobType } from "../types";
import { cacheGet, cacheSet, CACHE_TTL } from "../redis";

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_country?: string;
  job_employment_type?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_description?: string;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
  job_highlights?: { Qualifications?: string[] };
  job_is_remote?: boolean;
}

interface JSearchResponse {
  data?: JSearchJob[];
}

function mapEmploymentType(type?: string, remote?: boolean): JobType {
  if (remote) return "remote";
  switch ((type || "").toUpperCase()) {
    case "PARTTIME":
      return "part-time";
    case "INTERN":
      return "internship";
    case "CONTRACTOR":
      return "contract";
    default:
      return "full-time";
  }
}

export async function fetchJSearchJobs(role: string, city: string): Promise<Job[]> {
  if (!process.env.RAPIDAPI_KEY) {
    return []; // Source disabled when key absent.
  }

  const cacheKey = `jobs:jsearch:${role}:${city}`.toLowerCase();
  const cached = await cacheGet<Job[]>(cacheKey);
  if (cached) return cached;

  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", `${role} in ${city || "Pakistan"}`);
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "2");
  url.searchParams.set("date_posted", "month");

  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`JSearch responded ${res.status}`);

  const json = (await res.json()) as JSearchResponse;
  const now = new Date().toISOString();

  const jobs: Job[] = (json.data ?? []).map((j) => ({
    id: `jsearch-${j.job_id}`,
    externalId: j.job_id,
    title: j.job_title || "Untitled Role",
    company: j.employer_name || "Company",
    location: [j.job_city, j.job_country].filter(Boolean).join(", ") || "Pakistan",
    city: j.job_city || "Remote",
    salaryMin: j.job_min_salary,
    salaryMax: j.job_max_salary,
    salaryCurrency: j.job_salary_currency || "PKR",
    jobType: mapEmploymentType(j.job_employment_type, j.job_is_remote),
    description: j.job_description || "",
    requirements: j.job_highlights?.Qualifications ?? [],
    source: "jsearch",
    applyUrl: j.job_apply_link || "",
    postedAt: j.job_posted_at_datetime_utc || now,
    fetchedAt: now,
  }));

  await cacheSet(cacheKey, jobs, CACHE_TTL.default);
  return jobs;
}
