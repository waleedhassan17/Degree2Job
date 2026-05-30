import { NextRequest, NextResponse } from "next/server";
import { rowToJob, rowToMatch } from "@/lib/mappers";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Job lookup requires a configured database" },
        { status: 503 }
      );
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = rowToJob(data);

    // Attach the most recent match for this job if one exists.
    const { data: matchRow } = await supabase
      .from("job_matches")
      .select("*")
      .eq("job_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      job: matchRow ? { ...job, match: rowToMatch(matchRow) } : job,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lookup failed" },
      { status: 500 }
    );
  }
}
