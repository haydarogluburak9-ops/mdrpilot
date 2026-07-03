import { NextResponse } from "next/server";
import { listAdminCustomers } from "@/lib/admin/customers";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { statusForError } from "@/lib/auth/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const data = await listAdminCustomers();
    return NextResponse.json(data);
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
