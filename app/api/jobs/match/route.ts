import { NextRequest, NextResponse } from "next/server";
import { matchJob } from "@/lib/anthropic";
import { heuristicScore } from "@/lib/matching";
import { rowToJob } from "@/lib/mappers";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import { scoreToVerdict } from "@/lib/utils";
import type { Job, JobMatch, ParsedProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 90;

const BATCH_SIZE = 5;

async function loadProfile(resumeId: string): Promise<ParsedProfile | null> {
  if (!isSupabaseConfigured() || resumeId.startsWith("temp_")) return null;
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from("resumes")
      .select("parsed_profile")
      .eq("id", resumeId)
      .single();
    return (data?.parsed_profile as ParsedProfile) ?? null;
  } catch {
    return null;
  }
}

async function loadJobs(jobIds: string[]): Promise<Job[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase.from("jobs").select("*").in("id", jobIds);
    return (data ?? []).map(rowToJob);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { resumeId, jobIds, profile: bodyProfile, jobs: bodyJobs } =
      (await req.json()) as {
        resumeId?: string;
        jobIds?: string[];
        profile?: ParsedProfile;
        jobs?: Job[];
      };

    if (!resumeId && !bodyProfile) {
      return NextResponse.json({ error: "resumeId or profile required" }, { status: 400 });
    }

    const profile = bodyProfile ?? (resumeId ? await loadProfile(resumeId) : null);
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found — re-upload your resume" },
        { status: 404 }
      );
    }

    // Prefer jobs passed in the body; fall back to the Supabase cache.
    const jobs =
      bodyJobs && bodyJobs.length
        ? bodyJobs
        : await loadJobs(jobIds ?? []);

    if (!jobs.length) {
      return NextResponse.json({ matches: [] });
    }

    const matches: JobMatch[] = [];

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((job) => matchJob(profile, job))
      );
      results.forEach((res, idx) => {
        const job = batch[idx];
        if (res.status === "fulfilled") {
          matches.push({ jobId: job.id, ...res.value });
        } else {
          // Fallback to local heuristic if the AI call failed.
          const score = heuristicScore(profile, job);
          matches.push({
            jobId: job.id,
            score,
            verdict: scoreToVerdict(score),
            matchReasons: [],
            missingSkills: [],
            highlight: "",
          });
        }
      });
    }

    // Best-effort persistence of matches.
    if (isSupabaseConfigured() && resumeId && !resumeId.startsWith("temp_")) {
      try {
        const supabase = getSupabaseServer();
        await supabase.from("job_matches").upsert(
          matches.map((m) => ({
            resume_id: resumeId,
            job_id: m.jobId,
            score: m.score,
            verdict: m.verdict,
            match_reasons: m.matchReasons,
            missing_skills: m.missingSkills,
            highlight: m.highlight,
          })),
          { onConflict: "resume_id,job_id" }
        );
      } catch {
        // Non-fatal.
      }
    }

    return NextResponse.json({ matches });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Match failed" },
      { status: 500 }
    );
  }
}
