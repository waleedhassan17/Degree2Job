import { NextRequest, NextResponse } from "next/server";
import { fetchRozeeJobs } from "@/lib/scrapers/rozee";
import { fetchJSearchJobs } from "@/lib/scrapers/jsearch";
import { fetchMustakbilJobs } from "@/lib/scrapers/mustakbil";
import { fetchGovtJobs } from "@/lib/scrapers/govt";
import { fetchRemoteOkJobs } from "@/lib/scrapers/remoteok";
import { fetchMuseJobs } from "@/lib/scrapers/themuse";
import { applyFilters, dedupeJobs, filterRelevantJobs } from "@/lib/matching";
import { jobToRow } from "@/lib/mappers";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import type { Job, JobSource, SourceBreakdown, ParsedProfile, FilterState } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { profile, filters } = (await req.json()) as {
      profile?: ParsedProfile;
      filters?: FilterState;
    };
    const role = profile?.preferredRole || "Software Engineer";
    const city = profile?.preferredCity || "Lahore";

    const tasks: { source: JobSource; run: () => Promise<Job[]> }[] = [
      { source: "rozee", run: () => fetchRozeeJobs(role, city, profile) },
      { source: "remoteok", run: () => fetchRemoteOkJobs(role) },
      { source: "themuse", run: () => fetchMuseJobs(role, city) },
      { source: "jsearch", run: () => fetchJSearchJobs(role, city) },
      { source: "mustakbil", run: () => fetchMustakbilJobs(role, city) },
      { source: "nts", run: () => fetchGovtJobs() }, // returns nts + fpsc combined
    ];

    const settled = await Promise.allSettled(tasks.map((t) => t.run()));

    const breakdown: SourceBreakdown[] = [];
    let all: Job[] = [];

    settled.forEach((result, i) => {
      const source = tasks[i].source;
      if (result.status === "fulfilled") {
        const jobs = result.value;
        all = all.concat(jobs);
        if (source === "nts") {
          // govt task yields both nts + fpsc; report per actual source.
          const nts = jobs.filter((j) => j.source === "nts").length;
          const fpsc = jobs.filter((j) => j.source === "fpsc").length;
          breakdown.push({
            source: "nts",
            count: nts,
            status: nts === 0 ? "unavailable" : "ok",
          });
          breakdown.push({
            source: "fpsc",
            count: fpsc,
            status: fpsc === 0 ? "unavailable" : "ok",
          });
        } else {
          breakdown.push({
            source,
            count: jobs.length,
            status: jobs.length === 0 ? "unavailable" : "ok",
          });
        }
      } else {
        breakdown.push({ source, count: 0, status: "unavailable" });
        if (source === "nts") {
          breakdown.push({ source: "fpsc", count: 0, status: "unavailable" });
        }
      }
    });

    // Keep only jobs relevant to the user's preferred role, then apply any
    // explicit UI filters on top.
    const relevant = filterRelevantJobs(dedupeJobs(all), profile);
    const jobs = filters ? applyFilters(relevant as any, filters) : relevant;

    // Best-effort cache into Supabase for the match step to read back by id.
    if (isSupabaseConfigured() && jobs.length) {
      try {
        const supabase = getSupabaseServer();
        await supabase
          .from("jobs")
          .upsert(
            jobs.map((j) => ({ id: j.id, ...jobToRow(j) })),
            { onConflict: "id" }
          );
      } catch {
        // Non-fatal.
      }
    }

    return NextResponse.json({
      jobs,
      totalCount: jobs.length,
      sourceBreakdown: breakdown,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
