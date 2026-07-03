import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { listComposerDocuments } from "@/lib/data/queries";

export const runtime = "nodejs";

// GET /api/composer?productId=&type=&status= — company-scoped composer documents.
export async function GET(req: Request) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const documents = await listComposerDocuments(ctx.companyId, {
      productId: url.searchParams.get("productId") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return NextResponse.json({ documents });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
