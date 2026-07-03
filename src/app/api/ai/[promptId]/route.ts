import { NextResponse } from "next/server";
import { runPrompt } from "@/lib/ai/orchestrator";
import { PROMPTS, type PromptId } from "@/lib/ai/prompts";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { promptId: string } }) {
  try {
    // Auth + company isolation.
    const ctx = await requireCompany();

    const limit = rateLimit(clientKey(req, "ai"));
    if (!limit.ok) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const promptId = params.promptId as PromptId;
    if (!(promptId in PROMPTS)) {
      return NextResponse.json({ error: "Unknown prompt" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    // If a productId is supplied, enforce that it belongs to the caller's company.
    let productId: string | undefined;
    if (typeof body.productId === "string") {
      const product = await prisma.product.findFirst({
        where: { id: body.productId, deletedAt: null },
        select: { id: true, companyId: true },
      });
      if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
      assertCompanyAccess(product.companyId, ctx.companyId);
      productId = product.id;
    }

    const { result, source, meta } = await runPrompt(promptId, body, {
      companyId: ctx.companyId,
      userId: ctx.user.id,
      feature: promptId,
    });

    // Persist the analysis scoped to the company's product when applicable.
    if (productId) {
      await prisma.aIAnalysis.create({
        data: {
          productId,
          type: promptId.replace("-", "_").toUpperCase() as never,
          output: result as object,
          confidence: result.confidence,
          model: meta.model,
        },
      }).catch(() => {});
    }

    await writeAuditLog({
      action: "ai.run",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "AIAnalysis",
      entityId: productId,
      metadata: { promptId, source, provider: meta.provider, model: meta.model, latencyMs: meta.latencyMs },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ result, source });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/ai] error", err);
    return NextResponse.json({ error: message }, { status });
  }
}
