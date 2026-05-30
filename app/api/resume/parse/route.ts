import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/anthropic";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import { ensureAnonymousUser } from "@/lib/anonymous-user";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { rawText, sessionId, fileUrl } = (await req.json()) as {
      rawText?: string;
      sessionId?: string;
      fileUrl?: string;
    };

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "Resume text is too short to analyze" },
        { status: 400 }
      );
    }

    let profile;
    try {
      profile = await parseResume(rawText);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI parsing failed";
      const status = msg.includes("ANTHROPIC_API_KEY") ? 503 : 422;
      return NextResponse.json({ error: msg }, { status });
    }

    // Persist the resume if Supabase is configured; otherwise return a temp id.
    let resumeId = `temp_${Date.now()}`;
    let userId: string | null = null;
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServer();
        const user = await ensureAnonymousUser(sessionId ?? "anonymous");
        const { data, error } = await supabase
          .from("resumes")
          .insert({
            user_id: user?.id ?? null,
            session_id: sessionId ?? "anonymous",
            file_url: fileUrl ?? null,
            raw_text: rawText.slice(0, 50000),
            parsed_profile: profile,
          })
          .select("id")
          .single();
        if (!error && data) resumeId = data.id;
        if (user && data?.id) {
          userId = user.id;
          await supabase
            .from("anonymous_users")
            .update({ current_resume_id: data.id, updated_at: new Date().toISOString() })
            .eq("id", user.id);
        }
      } catch {
        // Non-fatal: continue with the temp id.
      }
    }

    return NextResponse.json({ resumeId, profile, userId: userId ?? sessionId ?? null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parse failed" },
      { status: 500 }
    );
  }
}
