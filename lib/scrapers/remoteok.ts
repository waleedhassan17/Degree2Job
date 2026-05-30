import type { Job } from "../types";
import { cacheGet, cacheSet, CACHE_TTL } from "../redis";

// RemoteOK exposes a free, keyless JSON feed of remote jobs worldwide —
// open to Pakistani applicants. The first array element is a legal notice,
// so we filter to entries that actually carry a position.
interface RemoteOKJob {
  id?: string | number;
  slug?: string;
  date?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  apply_url?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
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

function matchesRole(j: RemoteOKJob, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const hay = `${j.position ?? ""} ${(j.tags ?? []).join(" ")} ${
    j.description ?? ""
  }`.toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

// RemoteOK returns the same feed regardless of query, so we fetch+map it once
// (cached under a role-independent key) and only re-rank per role on each call.
// That makes switching roles instant after the first load.
async function getAllRemoteOk(): Promise<Job[]> {
  const cacheKey = "jobs:remoteok:all";
  const cached = await cacheGet<Job[]>(cacheKey);
  if (cached) return cached;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let data: RemoteOKJob[] = [];
  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; degree2job/1.0)",
        Accept: "application/json",
      },
      signal: ctrl.signal,
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`RemoteOK responded ${res.status}`);
    data = (await res.json()) as RemoteOKJob[];
  } finally {
    clearTimeout(timer);
  }

  const entries = (Array.isArray(data) ? data : []).filter((j) => j.position);
  const now = new Date().toISOString();
  const jobs: Job[] = entries.map((j) => ({
    id: `remoteok-${j.id ?? j.slug}`,
    externalId: String(j.id ?? j.slug ?? ""),
    title: j.position || "Remote Role",
    company: j.company || "Remote Employer",
    location: j.location?.trim() || "Remote",
    city: "Remote",
    salaryMin: j.salary_min,
    salaryMax: j.salary_max,
    salaryCurrency: "USD",
    jobType: "remote",
    description: stripHtml(j.description),
    requirements: Array.isArray(j.tags) ? j.tags.slice(0, 8) : [],
    source: "remoteok",
    applyUrl: j.apply_url || j.url || "https://remoteok.com/",
    postedAt: j.date ? new Date(j.date).toISOString() : now,
    fetchedAt: now,
  }));

  await cacheSet(cacheKey, jobs, CACHE_TTL.default);
  return jobs;
}

export async function fetchRemoteOkJobs(role: string): Promise<Job[]> {
  const all = await getAllRemoteOk();
  const tokens = role
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  // Rank role matches first, then fill with the rest so the feed is relevant.
  return [...all]
    .sort(
      (a, b) =>
        Number(matchesRole({ position: b.title, tags: b.requirements, description: b.description }, tokens)) -
        Number(matchesRole({ position: a.title, tags: a.requirements, description: a.description }, tokens))
    )
    .slice(0, 40);
}
