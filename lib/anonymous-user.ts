import { getSupabaseServer, isSupabaseConfigured } from "./supabase";
import type { ParsedProfile } from "./types";

export interface AnonymousUserState {
  userId: string | null;
  sessionId: string;
  resumeId: string | null;
  profile: ParsedProfile | null;
  savedJobIds: string[];
}

export async function ensureAnonymousUser(sessionId: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("anonymous_users")
    .upsert(
      { anon_key: sessionId, updated_at: new Date().toISOString() },
      { onConflict: "anon_key" }
    )
    .select("id,current_resume_id")
    .single();

  if (error || !data) return null;
  return data as { id: string; current_resume_id: string | null };
}

export async function loadAnonymousUserState(
  sessionId: string
): Promise<AnonymousUserState | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseServer();
  const ensured = await ensureAnonymousUser(sessionId);

  let userId: string | null = ensured?.id ?? null;
  let resumeId = ensured?.current_resume_id ?? null;
  let profile: ParsedProfile | null = null;

  if (userId && resumeId) {
    const { data: resumeRow } = await supabase
      .from("resumes")
      .select("id,parsed_profile")
      .eq("id", resumeId)
      .single();
    profile = (resumeRow?.parsed_profile as ParsedProfile) ?? null;
  }

  if (!resumeId || !profile) {
    const { data: latestResume } = await supabase
      .from("resumes")
      .select("id,parsed_profile")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestResume?.id) {
      resumeId = latestResume.id;
      profile = (latestResume.parsed_profile as ParsedProfile) ?? null;
      await supabase
        .from("anonymous_users")
        .update({ current_resume_id: resumeId, updated_at: new Date().toISOString() })
        .eq("id", ensured?.id ?? "");
    }
  }

  const savedQuery = userId
    ? supabase.from("saved_jobs").select("job_id").eq("user_id", userId)
    : supabase.from("saved_jobs").select("job_id").eq("session_id", sessionId);

  const { data: savedRows } = await savedQuery.order("created_at", {
    ascending: false,
  });

  if (!userId) {
    const { data: fallbackUser } = await supabase
      .from("saved_jobs")
      .select("session_id")
      .eq("session_id", sessionId)
      .limit(1)
      .maybeSingle();
    if (fallbackUser?.session_id) {
      userId = null;
    }
  }

  return {
    userId: userId ?? sessionId,
    sessionId,
    resumeId,
    profile,
    savedJobIds: (savedRows ?? []).map((row) => row.job_id as string),
  };
}
