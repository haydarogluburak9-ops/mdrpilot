import { NextResponse } from "next/server";
import { getRawSession, touchSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const raw = await getRawSession();
  if (!raw) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const ok = await touchSession(raw.token);
  if (!ok) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
