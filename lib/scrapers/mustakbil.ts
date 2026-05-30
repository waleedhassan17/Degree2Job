import { XMLParser } from "fast-xml-parser";
import type { Job } from "../types";
import { cacheGet, cacheSet, CACHE_TTL } from "../redis";

// Mustakbil publishes an official RSS feed with ~500 structured listings —
// far more reliable than scraping its HTML search pages. We fetch it directly
// from the Next.js app (no separate scraper service needed).
const RSS_URL = "https://rss.mustakbil.com/jobs-rss";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface RssItem {
  title?: string;
  link?: string;
  guid?: string | { "#text": string };
  description?: string;
  company?: string;
  city?: string;
  country?: string;
  category?: string | string[];
  pubdate?: string;
  pubDate?: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

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

function guidString(guid: RssItem["guid"]): string | undefined {
  if (!guid) return undefined;
  return typeof guid === "string" ? guid : guid["#text"];
}

// The feed's <pubdate> CDATA contains a literal "&#x2B;" for "+" and can be
// malformed, so parse defensively and fall back rather than throwing.
function safeDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const cleaned = value.replace(/&#x2b;/gi, "+").replace(/&#43;/g, "+").trim();
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml,application/xml,text/xml" },
      signal: ctrl.signal,
      next: { revalidate: 0 },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMustakbilJobs(role: string, city: string): Promise<Job[]> {
  const cacheKey = `jobs:mustakbil:${role}:${city}`.toLowerCase();
  const cached = await cacheGet<Job[]>(cacheKey);
  if (cached) return cached;

  const res = await fetchWithTimeout(RSS_URL, 15000);
  if (!res.ok) throw new Error(`Mustakbil RSS responded ${res.status}`);

  const xml = await res.text();
  const data = parser.parse(xml);
  const rawItems = data?.rss?.channel?.item;
  const items: RssItem[] = rawItems
    ? Array.isArray(rawItems)
      ? rawItems
      : [rawItems]
    : [];

  const roleTokens = role
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const cityLc = (city || "").toLowerCase();
  const now = new Date().toISOString();

  const scored = items
    .map((item) => {
      const jobCity = (item.city || city || "Pakistan").toString();
      const category = Array.isArray(item.category)
        ? item.category[0]
        : item.category;
      const description = stripHtml(item.description);
      const hay = `${item.title ?? ""} ${category ?? ""} ${description}`.toLowerCase();
      let rank = 0;
      if (roleTokens.length && roleTokens.some((t) => hay.includes(t))) rank += 2;
      if (cityLc && jobCity.toLowerCase().includes(cityLc)) rank += 1;

      const job: Job = {
        id: `mustakbil-${guidString(item.guid) ?? item.link ?? item.title ?? Math.random()}`
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .slice(0, 80),
        externalId: guidString(item.guid),
        title: item.title?.toString().trim() || "Untitled Role",
        company: item.company?.toString().trim() || "Mustakbil Employer",
        location: `${jobCity}, Pakistan`,
        city: jobCity,
        salaryCurrency: "PKR",
        jobType: "full-time",
        description: description.slice(0, 1500),
        requirements: [],
        source: "mustakbil",
        applyUrl:
          item.link?.toString().trim() ||
          guidString(item.guid) ||
          "https://www.mustakbil.com/jobs",
        postedAt: safeDate(item.pubDate || item.pubdate, now),
        fetchedAt: now,
      };
      return { rank, job };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 50)
    .map((s) => s.job);

  await cacheSet(cacheKey, scored, CACHE_TTL.default);
  return scored;
}
