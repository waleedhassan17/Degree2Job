import type { Job } from "../types";
import { cacheGet, cacheSet, CACHE_TTL } from "../redis";

interface RawScraperJob {
  title: string;
  company: string;
  location?: string;
  apply_url?: string;
  description?: string;
  posted_at?: string | null;
}

export async function fetchMustakbilJobs(
  role: string,
  city: string
): Promise<Job[]> {
  const base = process.env.SCRAPER_SERVICE_URL;
  if (!base) return []; // Source disabled without the Python service.

  const cacheKey = `jobs:mustakbil:${role}:${city}`.toLowerCase();
  const cached = await cacheGet<Job[]>(cacheKey);
  if (cached) return cached;

  const url = `${base.replace(/\/$/, "")}/scrape/mustakbil?role=${encodeURIComponent(
    role
  )}&city=${encodeURIComponent(city)}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Mustakbil scraper responded ${res.status}`);

  const raw = (await res.json()) as RawScraperJob[];
  const now = new Date().toISOString();

  const jobs: Job[] = raw.map((j, idx) => ({
    id: `mustakbil-${idx}-${j.title.slice(0, 12)}`.toLowerCase().replace(/\s+/g, "-"),
    externalId: `${idx}`,
    title: j.title,
    company: j.company || "Mustakbil Employer",
    location: j.location || city,
    city: j.location || city,
    salaryCurrency: "PKR",
    jobType: "full-time",
    description: j.description || "",
    requirements: [],
    source: "mustakbil",
    applyUrl: j.apply_url || "https://www.mustakbil.com/jobs/",
    postedAt: j.posted_at || now,
    fetchedAt: now,
  }));

  await cacheSet(cacheKey, jobs, CACHE_TTL.default);
  return jobs;
}
