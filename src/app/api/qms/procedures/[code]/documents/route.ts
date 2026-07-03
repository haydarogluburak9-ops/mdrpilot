import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import {
  createAndGenerateProcedureChild,
  generateAllProcedureChildren,
} from "@/lib/qms/procedure-document-service";
import type { QmsDocumentLayer } from "@/lib/qms/kys-structure";
import { PROCEDURE_CREATABLE_LAYERS } from "@/lib/qms/child-layer-guidance";
import { appLocaleSchema, parseAppLocale } from "@/lib/i18n/api-locale";

export const runtime = "nodejs";
export const maxDuration = 300;

const createSchema = z.object({
  layer: z.enum(PROCEDURE_CREATABLE_LAYERS as [QmsDocumentLayer, ...QmsDocumentLayer[]]),
  title: z.string().min(1).max(500),
  userContext: z.string().max(8000).optional(),
  code: z.string().max(64).optional(),
  locale: appLocaleSchema.optional(),
  generate: z.boolean().optional(),
});

// POST /api/qms/procedures/[code]/documents — create child doc (+ optional AI)
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const locale = parseAppLocale(parsed.data.locale);
    const generatedBy = ctx.user.name ?? ctx.user.email;
    const procedureCode = decodeURIComponent(params.code).trim();

    if (parsed.data.generate !== false) {
      const result = await createAndGenerateProcedureChild({
        companyId: ctx.companyId,
        procedureCode,
        layer: parsed.data.layer,
        title: parsed.data.title,
        userContext: parsed.data.userContext,
        locale,
        generatedBy,
        code: parsed.data.code,
      });

      await writeAuditLog({
        action: "qms.procedure.create_child",
        companyId: ctx.companyId,
        userId: ctx.user.id,
        entity: "QMSDocument",
        entityId: result.documentId,
        metadata: { code: result.code, procedureCode, layer: parsed.data.layer },
        ip: ipFromRequest(req),
      });

      return NextResponse.json(result);
    }

    const { createProcedureChildDocument } = await import("@/lib/qms/procedure-document-service");
    const created = await createProcedureChildDocument({
      companyId: ctx.companyId,
      procedureCode,
      layer: parsed.data.layer,
      title: parsed.data.title,
      code: parsed.data.code,
    });

    return NextResponse.json({ documentId: created.id, code: created.code });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/procedures/documents POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

const bulkSchema = z.object({
  locale: appLocaleSchema.optional(),
  onlyEmpty: z.boolean().optional(),
  childHints: z.record(z.string(), z.string()).optional(),
});

// PUT — generate all linked children for this procedure
export async function PUT(req: Request, { params }: { params: { code: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bulkSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const locale = parseAppLocale(parsed.data.locale);
    const generatedBy = ctx.user.name ?? ctx.user.email;
    const procedureCode = decodeURIComponent(params.code).trim();

    const result = await generateAllProcedureChildren({
      companyId: ctx.companyId,
      procedureCode,
      locale,
      generatedBy,
      onlyEmpty: parsed.data.onlyEmpty ?? true,
      childHints: parsed.data.childHints,
    });

    await writeAuditLog({
      action: "qms.procedure.generate_children",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "QMSDocument",
      metadata: {
        procedureCode,
        generated: result.generated.length,
        failed: result.failed.length,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/procedures/documents PUT]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
