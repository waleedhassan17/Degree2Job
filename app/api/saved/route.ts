import { NextRequest, NextResponse } from "next/server";
import { rowToJob } from "@/lib/mappers";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import { ensureAnonymousUser } from "@/lib/anonymous-user";
import type { SavedJob, ApplicationStatus } from "@/lib/types";

export const runtime = "nodejs";

const VALID_STATUS: ApplicationStatus[] = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
];

function notConfigured() {
  return NextResponse.json(
    { error: "Saved jobs require a configured database", saved: [] },
    { status: 200 }
  );
}

function fallbackSaved() {
  return NextResponse.json({ saved: [] }, { status: 200 });
}

// GET /api/saved?sessionId=...
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) return notConfigured();
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  try {
    const supabase = getSupabaseServer();
    const user = await ensureAnonymousUser(sessionId);
    const query = user
      ? supabase.from("saved_jobs").select("*, job:jobs(*)").eq("user_id", user.id)
      : supabase
          .from("saved_jobs")
          .select("*, job:jobs(*)")
          .eq("session_id", sessionId);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    const saved: SavedJob[] = (data ?? []).map((row) => ({
      id: row.id,
      jobId: row.job_id,
      status: row.status,
      notes: row.notes ?? undefined,
      appliedAt: row.applied_at ?? undefined,
      createdAt: row.created_at,
      job: row.job ? rowToJob(row.job) : undefined,
    }));

    return NextResponse.json({ saved });
  } catch (e) {
    return fallbackSaved();
  }
}

// POST /api/saved  { sessionId, jobId }
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return notConfigured();
  try {
    const { sessionId, jobId } = (await req.json()) as {
      sessionId?: string;
      jobId?: string;
    };
    if (!sessionId || !jobId) {
      return NextResponse.json(
        { error: "sessionId and jobId required" },
        { status: 400 }
      );
    }
    const supabase = getSupabaseServer();
    const user = await ensureAnonymousUser(sessionId);
    if (user) {
      const { error } = await supabase.from("saved_jobs").upsert(
        { user_id: user.id, session_id: sessionId, job_id: jobId, status: "saved" },
        { onConflict: "user_id,job_id" }
      );
      if (error) throw error;
    } else {
      const { error } = await supabase.from("saved_jobs").upsert(
        { session_id: sessionId, job_id: jobId, status: "saved" },
        { onConflict: "session_id,job_id" }
      );
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}

// PATCH /api/saved  { sessionId, jobId, status, notes? }
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) return notConfigured();
  try {
    const { sessionId, jobId, status, notes } = (await req.json()) as {
      sessionId?: string;
      jobId?: string;
      status?: ApplicationStatus;
      notes?: string;
    };
    if (!sessionId || !jobId || !status) {
      return NextResponse.json(
        { error: "sessionId, jobId and status required" },
        { status: 400 }
      );
    }
    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const user = await ensureAnonymousUser(sessionId);
    const patch: Record<string, unknown> = { status };
    if (notes !== undefined) patch.notes = notes;
    if (status === "applied") patch.applied_at = new Date().toISOString();

    const query = user
      ? supabase.from("saved_jobs").update(patch).eq("user_id", user.id)
      : supabase.from("saved_jobs").update(patch).eq("session_id", sessionId);

    const { error } = await query.eq("job_id", jobId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}

// DELETE /api/saved  { sessionId, jobId }
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured()) return notConfigured();
  try {
    const { sessionId, jobId } = (await req.json()) as {
      sessionId?: string;
      jobId?: string;
    };
    if (!sessionId || !jobId) {
      return NextResponse.json(
        { error: "sessionId and jobId required" },
        { status: 400 }
      );
    }
    const supabase = getSupabaseServer();
    const user = await ensureAnonymousUser(sessionId);
    const query = user
      ? supabase.from("saved_jobs").delete().eq("user_id", user.id)
      : supabase.from("saved_jobs").delete().eq("session_id", sessionId);

    const { error } = await query.eq("job_id", jobId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}
