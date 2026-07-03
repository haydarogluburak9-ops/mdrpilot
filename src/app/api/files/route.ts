import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { listFilesDetailed } from "@/lib/data/queries";

export const runtime = "nodejs";

// GET /api/files?productId=&documentKind= — company-scoped file list.
export async function GET(req: Request) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId") ?? undefined;
    const documentKind = url.searchParams.get("documentKind") ?? undefined;
    const files = await listFilesDetailed(ctx.companyId, { productId, documentKind });
    return NextResponse.json({ files });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/files GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
