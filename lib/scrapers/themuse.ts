import type { Job, JobType } from "../types";
import { cacheGet, cacheSet, CACHE_TTL } from "../redis";
import { stripHtml, decodeEntities } from "./html";

// The Muse offers a free, keyless public jobs API with global + remote roles.
// We pull a couple of pages and rank Pakistan / remote roles first.
interface MuseJob {
  id: number;
  name: string;
  contents?: string;
  type?: string;
  publication_date?: string;
  company?: { name?: string };
  locations?: { name?: string }[];
  categories?: { name?: string }[];
  levels?: { name?: string; short_name?: string }[];
  refs?: { landing_page?: string };
}

interface MuseResponse {
  results?: MuseJob[];
}

function jobTypeFor(j: MuseJob): JobType {
  const loc = (j.locations ?? []).map((l) => l.name?.toLowerCase() ?? "").join(" ");
  if (loc.includes("remote") || loc.includes("flexible")) return "remote";
  const level = (j.levels ?? [])[0]?.short_name ?? "";
  if (level === "internship") return "internship";
  return "full-time";
}

// The Muse query here is fixed, so fetch + map once (role-independent cache)
// and re-rank per role/city on each call.
async function getAllMuse(): Promise<Job[]> {
  const cacheKey = "jobs:themuse:all";
  const cached = await cacheGet<Job[]>(cacheKey);
  if (cached) return cached;

  const url = new URL("https://www.themuse.com/api/public/jobs");
  url.searchParams.set("page", "1");
  // The Muse maps free-text loosely; "Software Engineering" is a valid category.
  url.searchParams.set("category", "Software Engineering");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let json: MuseResponse;
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; degree2job/1.0)",
        Accept: "application/json",
      },
      signal: ctrl.signal,
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`The Muse responded ${res.status}`);
    json = (await res.json()) as MuseResponse;
  } finally {
    clearTimeout(timer);
  }

  const now = new Date().toISOString();
  const jobs: Job[] = (json.results ?? []).map((j) => {
    const location = decodeEntities(j.locations?.[0]?.name?.trim()) || "Remote";
    return {
      id: `themuse-${j.id}`,
      externalId: String(j.id),
      title: decodeEntities(j.name) || "Untitled Role",
      company: decodeEntities(j.company?.name) || "Company",
      location,
      city: location,
      salaryCurrency: "USD",
      jobType: jobTypeFor(j),
      description: stripHtml(j.contents),
      requirements: (j.categories ?? [])
        .map((c) => c.name)
        .filter((n): n is string => Boolean(n))
        .slice(0, 6),
      source: "themuse",
      applyUrl: j.refs?.landing_page || "https://www.themuse.com/jobs",
      postedAt: j.publication_date
        ? new Date(j.publication_date).toISOString()
        : now,
      fetchedAt: now,
    };
  });

  await cacheSet(cacheKey, jobs, CACHE_TTL.default);
  return jobs;
}

export async function fetchMuseJobs(role: string, city: string): Promise<Job[]> {
  const all = await getAllMuse();
  const tokens = role
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const cityLc = city.toLowerCase();

  return [...all]
    .map((job) => {
      const text = `${job.title} ${job.requirements.join(" ")}`.toLowerCase();
      const loc = job.location.toLowerCase();
      let rank = 0;
      if (tokens.some((t) => text.includes(t))) rank += 2;
      if (loc.includes("pakistan") || (cityLc && loc.includes(cityLc))) rank += 3;
      if (loc.includes("remote") || loc.includes("flexible")) rank += 1;
      return { rank, job };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 30)
    .map((s) => s.job);
}
