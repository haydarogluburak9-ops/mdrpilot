import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { ensureProcedurePack, getProcedurePack } from "@/lib/qms/procedure-packs";
import { generateAllProcedureChildren } from "@/lib/qms/procedure-document-service";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/qms/procedures/[code]/ensure-pack — scaffold + link shared docs + optional AI fill
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const procedureCode = decodeURIComponent(params.code).trim().toUpperCase();
    const pack = getProcedurePack(procedureCode);
    if (!pack) {
      return NextResponse.json({ error: "No procedure pack defined" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      locale?: "tr" | "en";
      generate?: boolean;
      onlyEmpty?: boolean;
    };
    const locale = body.locale ?? "tr";
    const generatedBy = ctx.user.name ?? ctx.user.email;

    const scaffold = await ensureProcedurePack(ctx.companyId, procedureCode);

    let generateResult = null;
    if (body.generate !== false) {
      generateResult = await generateAllProcedureChildren({
        companyId: ctx.companyId,
        procedureCode,
        locale,
        generatedBy,
        onlyEmpty: body.onlyEmpty ?? true,
        ensurePack: false,
      });
    }

    await writeAuditLog({
      action: "qms.procedure.ensure_pack",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "QMSDocument",
      metadata: {
        procedureCode,
        created: scaffold.created,
        linked: scaffold.linked,
        generated: generateResult?.generated.length ?? 0,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ scaffold, generate: generateResult });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/procedures/ensure-pack POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
