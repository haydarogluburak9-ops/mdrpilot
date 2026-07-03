import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import {
  loadProductQualityBundle,
  loadProductRegulatoryReminders,
} from "@/lib/products/product-quality-service";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") === "en" ? "en" : "tr";

    const [bundle, reminders] = await Promise.all([
      loadProductQualityBundle(ctx.companyId, params.id),
      loadProductRegulatoryReminders(ctx.companyId, params.id, locale),
    ]);

    if (!bundle) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ ...bundle, reminders });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/quality-records GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
