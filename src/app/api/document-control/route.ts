import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import {
  loadControlledDocuments,
  listApprovalHistory,
} from "@/lib/document-control/service";
import { isAppLocale, type Lang } from "@/lib/i18n/locales";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireRole("VIEWER");
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId")?.trim() || undefined;
    const history = url.searchParams.get("history") === "1";
    const langParam = url.searchParams.get("lang")?.trim();
    const lang: Lang = isAppLocale(langParam) ? langParam : "en";

    if (history) {
      const rows = await listApprovalHistory(ctx.companyId);
      return NextResponse.json({ history: rows });
    }

    const documents = await loadControlledDocuments(ctx.companyId, productId, lang);
    return NextResponse.json({ documents });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/document-control GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
