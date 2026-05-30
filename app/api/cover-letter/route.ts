import { NextRequest } from "next/server";
import {
  getGemini,
  buildCoverLetterPrompt,
  COVER_LETTER_SYSTEM,
  GEMINI_MODEL,
} from "@/lib/anthropic";
import { rowToJob } from "@/lib/mappers";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import type { Job, ParsedProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  let body: {
    resumeId?: string;
    jobId?: string;
    profile?: ParsedProfile;
    job?: Job;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const { resumeId, jobId, profile: bodyProfile, job: bodyJob } = body;

  // Resolve profile + job from body or Supabase.
  let profile = bodyProfile ?? null;
  let job = bodyJob ?? null;

  if ((!profile || !job) && isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServer();
      if (!profile && resumeId && !resumeId.startsWith("temp_")) {
        const { data } = await supabase
          .from("resumes")
          .select("parsed_profile")
          .eq("id", resumeId)
          .single();
        profile = (data?.parsed_profile as ParsedProfile) ?? null;
      }
      if (!job && jobId) {
        const { data } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .single();
        job = data ? rowToJob(data) : null;
      }
    } catch {
      // Fall through to validation below.
    }
  }

  if (!profile) return jsonError("Profile not found — re-upload your resume", 404);
  if (!job) return jsonError("Job not found", 404);

  let gemini;
  try {
    gemini = getGemini();
  } catch {
    return jsonError("AI is not configured (missing GEMINI_API_KEY)", 503);
  }

  const prompt = buildCoverLetterPrompt(profile, job);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const model = gemini.getGenerativeModel({
          model: GEMINI_MODEL,
          systemInstruction: COVER_LETTER_SYSTEM,
        });
        const response = await model.generateContent(prompt);
        const text = response.response.text();

        controller.enqueue(encoder.encode(text));
        controller.close();
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `\n\n[Error generating cover letter: ${
              e instanceof Error ? e.message : "unknown"
            }]`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
