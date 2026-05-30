import type { Job, ParsedProfile } from "../types";
import { cacheGet, cacheSet, CACHE_TTL } from "../redis";

const BASE = "https://www.rozee.pk";

function stripHtml(value?: string): string {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function searchUrl(role: string, city: string): string {
  const roleSlug = slugify(role) || "all";
  const citySlug = slugify(city);
  return citySlug ? `${BASE}/job/jsearch/q/${roleSlug}/${citySlug}` : `${BASE}/job/jsearch/q/${roleSlug}`;
}

function extractJsonObject(source: string, start: number): string | null {
  let inString = false;
  let escape = false;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const ch = source[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  return null;
}

function parseRecords(html: string): Array<Record<string, any>> {
  const records: Array<Record<string, any>> = [];
  let cursor = 0;
  while (true) {
    const start = html.indexOf('{"jid":"', cursor);
    if (start === -1) break;
    const objText = extractJsonObject(html, start);
    cursor = start + 1;
    if (!objText) continue;
    try {
      const record = JSON.parse(objText);
      if (record && typeof record === "object") records.push(record);
    } catch {
      // Skip malformed entries.
    }
  }
  return records;
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2) ?? [];
}

function profileSignature(profile?: ParsedProfile | null): string {
  if (!profile) return "";
  return [
    profile.preferredRole,
    profile.preferredCity,
    profile.experienceLevel,
    ...profile.skills.slice(0, 5),
  ]
    .map((part) => slugify(String(part || "")))
    .filter(Boolean)
    .join("-");
}

function inferExperienceLevel(text: string): string | null {
  const lowered = text.toLowerCase();
  if (/(fresh|intern)/.test(lowered)) return "fresher";
  if (/(1\s*year|entry|junior)/.test(lowered)) return "junior";
  if (/(2\s*year|3\s*year|mid)/.test(lowered)) return "mid";
  if (/(4\s*year|5\s*year|6\s*year|7\s*year|senior|lead|manager)/.test(lowered)) return "senior";
  return null;
}

function scoreRecord(record: Record<string, any>, role: string, city: string, profile?: ParsedProfile | null): number {
  const combined = [
    record.title,
    record.company,
    record.description,
    Array.isArray(record.skills) ? record.skills.join(" ") : "",
    Array.isArray(record.city_exact) ? record.city_exact.join(" ") : "",
    record.experience_text,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const tokens = new Set([
    ...normalizeTokens(role),
    ...normalizeTokens(city),
    ...(profile ? normalizeTokens(profile.preferredRole) : []),
    ...(profile ? normalizeTokens(profile.preferredCity) : []),
    ...(profile ? profile.skills.flatMap((skill) => normalizeTokens(skill)) : []),
  ]);

  let score = 0;
  for (const token of Array.from(tokens)) {
    if (combined.includes(token)) score += 2;
  }

  if (profile?.preferredCity) {
    const cities = Array.isArray(record.city_exact) ? record.city_exact.map((c: any) => String(c).toLowerCase()) : [];
    if (cities.some((c: string) => c.includes(profile.preferredCity.toLowerCase()))) {
      score += 6;
    }
  }

  const roleWords = normalizeTokens(profile?.preferredRole || role);
  const title = String(record.title || record.title_exact || "").toLowerCase();
  if (roleWords.some((word) => title.includes(word))) score += 10;

  const expLevel = inferExperienceLevel(String(record.experience_text || record.experience_exact || ""));
  if (profile?.experienceLevel && expLevel) {
    if (profile.experienceLevel === expLevel) score += 4;
    else if (profile.experienceLevel === "fresher" && (expLevel === "fresher" || expLevel === "junior")) score += 4;
    else if (profile.experienceLevel === "junior" && ["fresher", "junior", "mid"].includes(expLevel)) score += 2;
    else if (profile.experienceLevel === "mid" && ["junior", "mid", "senior"].includes(expLevel)) score += 1;
  }

  return score;
}

export async function fetchRozeeJobs(
  role: string,
  city: string,
  profile?: ParsedProfile | null
): Promise<Job[]> {
  const cacheKey = `jobs:rozee:${role}:${city}:${profileSignature(profile)}`.toLowerCase();
  const cached = await cacheGet<Job[]>(cacheKey);
  if (cached) return cached;

  const url = searchUrl(role, city);
  let jobs: Job[] = [];

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const html = await res.text();
      const now = new Date().toISOString();
      const records = parseRecords(html)
        .map((record) => ({ record, score: scoreRecord(record, role, city, profile) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 100)
        .map(({ record }) => record);

      jobs = records.map((record, idx) => {
        const cities = Array.isArray(record.city_exact) ? record.city_exact : [];
        const loc = cities[0] || record.city || city || "Pakistan";
        const title = String(record.title || record.title_exact || "Untitled Role").trim();
        const company = String(record.company || record.company_exact || record.company_name || "Rozee Employer").trim();
        const description = stripHtml(record.description_raw || record.description || "");
        const skills = Array.isArray(record.skills) ? record.skills.map((s: any) => String(s)).filter(Boolean) : [];
        const applyUrl = record.rozeePermaLink || record.permaLink ? `${BASE}/${record.rozeePermaLink || record.permaLink}` : BASE;
        return {
          id: `rozee-${record.jid || idx}-${slugify(title || "job")}`
            .toLowerCase()
            .replace(/\s+/g, "-"),
          externalId: String(record.jid || idx),
          title: title || "Untitled Role",
          company: company || "Rozee Employer",
          location: loc,
          city: loc,
          salaryCurrency: "PKR",
          jobType: "full-time",
          experienceRequired: String(record.experience_text || record.experience_exact || "").trim() || undefined,
          description,
          requirements: skills,
          source: "rozee",
          applyUrl,
          postedAt:
            (record.displayDate && new Date(record.displayDate).toISOString()) ||
            (record.created_at && new Date(record.created_at).toISOString()) ||
            (record.created && new Date(record.created).toISOString()) ||
            now,
          fetchedAt: now,
        };
      });
    }
  } catch {
    // Network error or block — leave jobs empty (source marked unavailable).
    jobs = [];
  }

  // Only cache positive results so we keep retrying while the source is down.
  if (jobs.length) await cacheSet(cacheKey, jobs, CACHE_TTL.default);
  return jobs;
}
