import { NextRequest, NextResponse } from "next/server";
import { loadAnonymousUserState } from "@/lib/anonymous-user";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const state = await loadAnonymousUserState(sessionId);
    return NextResponse.json({ user: state });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load user" },
      { status: 200 }
    );
  }
}
