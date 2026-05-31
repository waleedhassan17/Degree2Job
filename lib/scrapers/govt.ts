import type { Job } from "../types";
import { cacheGet, cacheSet, CACHE_TTL } from "../redis";
import { stripHtml } from "./html";

// Government jobs are scraped directly from the Next.js app (no separate
// service needed):
//   - NTS:  HTML listing at /new/projectsnew.php (li.product blocks)
//   - FPSC: JSON API at /api/Jobs
// Both are best-effort: a failure in one never blocks the other.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function fetchWithTimeout(
  url: string,
  ms: number,
  headers: Record<string, string>
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers, signal: ctrl.signal, next: { revalidate: 0 } });
  } finally {
    clearTimeout(timer);
  }
}

// Some government endpoints (notably FPSC) are intermittently slow, so retry
// once with a longer timeout before giving up.
async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  timeouts: number[]
): Promise<Response | null> {
  for (const ms of timeouts) {
    try {
      const res = await fetchWithTimeout(url, ms, headers);
      if (res.ok) return res;
    } catch {
      // try next timeout
    }
  }
  return null;
}

// ── NTS ──────────────────────────────────────────────────────────────
const NTS_URL = "https://www.nts.org.pk/new/projectsnew.php";
const NTS_BASE = "https://www.nts.org.pk";

async function fetchNts(now: string): Promise<Job[]> {
  const res = await fetchWithRetry(NTS_URL, { "User-Agent": UA }, [7000, 9000]);
  if (!res) return [];
  const html = await res.text();

  const re =
    /<div class="product-name">\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const jobs: Job[] = [];
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].startsWith("/") ? NTS_BASE + m[1] : m[1];
    const title = stripHtml(m[2]).slice(0, 160);
    if (!title) continue;
    jobs.push({
      id: `nts-${idx}-${title.slice(0, 14)}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
      externalId: `${idx}`,
      title,
      company: "National Testing Service (NTS)",
      location: "Pakistan",
      city: "Islamabad",
      salaryCurrency: "PKR",
      jobType: "full-time",
      description: "Government recruitment / test announcement via NTS.",
      requirements: [],
      source: "nts",
      applyUrl: href || NTS_BASE,
      postedAt: now,
      fetchedAt: now,
    });
    idx += 1;
  }
  return jobs.slice(0, 50);
}

// ── FPSC ─────────────────────────────────────────────────────────────
const FPSC_API = "https://www.fpsc.gov.pk/api/Jobs";
const FPSC_BASE = "https://www.fpsc.gov.pk";
const FPSC_CATEGORY: Record<string, string> = {
  GR: "General Recruitment",
  CSS: "CSS Examination",
};

interface FpscRow {
  id: number;
  category?: string;
  title?: string;
  date?: string;
  createdAt?: string;
  description?: string;
}

function firstPdf(description?: string): string | null {
  const m = /href="([^"]+\.pdf)"/i.exec(description || "");
  if (!m) return null;
  return m[1].startsWith("http") ? m[1] : FPSC_BASE + m[1];
}

async function fetchFpsc(now: string): Promise<Job[]> {
  const res = await fetchWithRetry(
    FPSC_API,
    { "User-Agent": UA, Accept: "application/json" },
    [7000, 9000]
  );
  if (!res) return [];
  const json = (await res.json()) as { data?: FpscRow[] };
  const rows = json.data ?? [];

  return rows
    .filter((r) => (r.title || "").trim())
    .map((r) => {
      const label = FPSC_CATEGORY[r.category ?? ""] || r.category || "";
      const cleanName = stripHtml(r.title) || "FPSC Announcement";
      const title = label ? `${cleanName} (${label})` : cleanName;
      return {
        id: `fpsc-${r.id}`,
        externalId: `${r.id}`,
        title,
        company: "Federal Public Service Commission (FPSC)",
        location: "Islamabad, Pakistan",
        city: "Islamabad",
        salaryCurrency: "PKR",
        jobType: "full-time",
        description: stripHtml(r.description).slice(0, 1500),
        requirements: [],
        source: "fpsc",
        applyUrl: firstPdf(r.description) || `${FPSC_BASE}/Jobs`,
        postedAt: r.date || r.createdAt || now,
        fetchedAt: now,
      } as Job;
    })
    .slice(0, 50);
}

export async function fetchGovtJobs(): Promise<Job[]> {
  const cacheKey = "jobs:govt";
  const cached = await cacheGet<Job[]>(cacheKey);
  if (cached) return cached;

  const now = new Date().toISOString();
  const [nts, fpsc] = await Promise.allSettled([fetchNts(now), fetchFpsc(now)]);

  const jobs: Job[] = [
    ...(nts.status === "fulfilled" ? nts.value : []),
    ...(fpsc.status === "fulfilled" ? fpsc.value : []),
  ];

  if (jobs.length) await cacheSet(cacheKey, jobs, CACHE_TTL.govt);
  return jobs;
}
