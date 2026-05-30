import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { JobType, JobSource, Verdict } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stable, client-persistable anonymous session id. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "jobpulse_session_id";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess_${Math.random().toString(36).slice(2)}${Date.now()}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export function formatSalary(
  min?: number,
  max?: number,
  currency = "PKR"
): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return `${n}`;
  };
  if (min && max) return `${currency} ${fmt(min)}–${fmt(max)}`;
  return `${currency} ${fmt((min ?? max)!)}+`;
}

export function timeAgo(iso?: string): string {
  if (!iso) return "Recently";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Recently";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function initials(name?: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export const SOURCE_LABELS: Record<JobSource, string> = {
  rozee: "Rozee.pk",
  mustakbil: "Mustakbil",
  nts: "NTS",
  fpsc: "FPSC",
  jsearch: "International",
  remoteok: "RemoteOK",
  themuse: "The Muse",
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  internship: "Internship",
  contract: "Contract",
  remote: "Remote",
  hybrid: "Hybrid",
};

export const VERDICT_COLOR: Record<Verdict, string> = {
  excellent: "text-emerald-600",
  good: "text-amber-600",
  fair: "text-amber-600",
  poor: "text-rose-600",
};

export function scoreToVerdict(score: number): Verdict {
  if (score >= 80) return "excellent";
  if (score >= 65) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

/** Stable dedupe key for jobs (title + company, normalized). */
export function jobKey(title: string, company: string): string {
  return `${title}__${company}`.toLowerCase().replace(/\s+/g, " ").trim();
}

export const PK_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Faisalabad",
  "Rawalpindi",
  "Remote",
];

/** Tolerant JSON extraction from an LLM response that may wrap JSON in prose/fences. */
export function safeJsonFromText<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    if (start === -1) return null;
    const open = cleaned[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === open) depth++;
      else if (cleaned[i] === close) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, i + 1)) as T;
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
}
