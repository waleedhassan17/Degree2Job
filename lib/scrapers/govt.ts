import type { Job, JobSource } from "../types";
import { cacheGet, cacheSet, CACHE_TTL } from "../redis";

interface RawGovtJob {
  title: string;
  company?: string;
  organization?: string;
  location?: string;
  apply_url?: string;
  description?: string;
  source?: string;
  posted_at?: string | null;
}

export async function fetchGovtJobs(): Promise<Job[]> {
  const base = process.env.SCRAPER_SERVICE_URL;
  if (!base) return []; // Source disabled without the Python service.

  const cacheKey = "jobs:govt";
  const cached = await cacheGet<Job[]>(cacheKey);
  if (cached) return cached;

  const url = `${base.replace(/\/$/, "")}/scrape/govt`;
  const apiKey = process.env.SCRAPER_API_KEY;
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });
  if (!res.ok) throw new Error(`Govt scraper responded ${res.status}`);

  const raw = (await res.json()) as RawGovtJob[];
  const now = new Date().toISOString();

  const jobs: Job[] = raw.map((j, idx) => {
    const source: JobSource = j.source === "fpsc" ? "fpsc" : "nts";
    return {
      id: `${source}-${idx}-${(j.title || "").slice(0, 12)}`
        .toLowerCase()
        .replace(/\s+/g, "-"),
      externalId: `${idx}`,
      title: j.title || "Government Position",
      company: j.organization || j.company || (source === "fpsc" ? "FPSC" : "NTS"),
      location: j.location || "Pakistan",
      city: j.location || "Islamabad",
      salaryCurrency: "PKR",
      jobType: "full-time",
      description: j.description || "",
      requirements: [],
      source,
      applyUrl:
        j.apply_url ||
        (source === "fpsc" ? "https://www.fpsc.gov.pk/" : "https://nts.org.pk/"),
      postedAt: j.posted_at || now,
      fetchedAt: now,
    };
  });

  await cacheSet(cacheKey, jobs, CACHE_TTL.govt);
  return jobs;
}
