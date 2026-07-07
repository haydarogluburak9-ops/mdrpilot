import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { syncLiteratureAcceptedArticles } from "@/lib/products/clinical-literature-article-sync-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
});

// POST — fetch open-access PDFs for PubMed included studies (EK-4)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const locale = parsed.data.locale ?? "tr";
    const result = await syncLiteratureAcceptedArticles(ctx.companyId, params.id, locale);
    if (!result) {
      return NextResponse.json({ error: "Literature data not found — run search first" }, { status: 400 });
    }

    await writeAuditLog({
      action: "clinical_evaluation.literature.articles.sync",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "ClinicalEvaluation",
      entityId: result.evaluation.id,
      metadata: {
        productId: params.id,
        fetched: result.articleSync.fetched,
        unavailable: result.articleSync.unavailable,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      evaluation: result.evaluation,
      articleSync: result.articleSync,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/literature/articles/sync POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
