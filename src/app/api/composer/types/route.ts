import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { COMPOSER_TYPES } from "@/lib/composer/types";

export const runtime = "nodejs";

// GET /api/composer/types — available document composer types.
export async function GET() {
  try {
    await requireCompany();
    return NextResponse.json({ types: COMPOSER_TYPES });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
