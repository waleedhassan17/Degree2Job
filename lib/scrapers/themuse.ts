import type { Job, JobType } from "../types";
import { cacheGet, cacheSet, CACHE_TTL } from "../redis";

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

function stripHtml(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jobTypeFor(j: MuseJob): JobType {
  const loc = (j.locations ?? []).map((l) => l.name?.toLowerCase() ?? "").join(" ");
  if (loc.includes("remote") || loc.includes("flexible")) return "remote";
  const level = (j.levels ?? [])[0]?.short_name ?? "";
  if (level === "internship") return "internship";
  return "full-time";
}

export async function fetchMuseJobs(role: string, city: string): Promise<Job[]> {
  const cacheKey = `jobs:themuse:${role}`.toLowerCase();
  const cached = await cacheGet<Job[]>(cacheKey);
  if (cached) return cached;

  const url = new URL("https://www.themuse.com/api/public/jobs");
  url.searchParams.set("page", "1");
  // The Muse maps free-text loosely; "Software Engineering" is a valid category.
  url.searchParams.set("category", "Software Engineering");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; degree2job/1.0)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`The Muse responded ${res.status}`);

  const json = (await res.json()) as MuseResponse;
  const results = json.results ?? [];

  const tokens = role
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const cityLc = city.toLowerCase();

  // Rank: role-matching first, then Pakistan/remote, so the feed feels relevant.
  const scored = results
    .map((j) => {
      const text = `${j.name} ${(j.categories ?? [])
        .map((c) => c.name)
        .join(" ")}`.toLowerCase();
      const loc = (j.locations ?? []).map((l) => l.name?.toLowerCase()).join(" ");
      let rank = 0;
      if (tokens.some((t) => text.includes(t))) rank += 2;
      if (loc.includes("pakistan") || loc.includes(cityLc)) rank += 3;
      if (loc.includes("remote") || loc.includes("flexible")) rank += 1;
      return { j, rank };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 30);

  const now = new Date().toISOString();
  const jobs: Job[] = scored.map(({ j }) => {
    const location = j.locations?.[0]?.name?.trim() || "Remote";
    return {
      id: `themuse-${j.id}`,
      externalId: String(j.id),
      title: j.name || "Untitled Role",
      company: j.company?.name || "Company",
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
