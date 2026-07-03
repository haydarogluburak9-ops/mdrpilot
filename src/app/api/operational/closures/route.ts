import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import {
  createCapaFromComplaint,
  createCapaFromInternalAudit,
  createVigilanceFromComplaint,
} from "@/lib/operational/closure-loops";

export const runtime = "nodejs";

const auditSchema = z.object({
  action: z.literal("capa-from-audit"),
  auditCycleId: z.string().min(1),
  findingTitle: z.string().min(1).max(500),
  findingDescription: z.string().max(5000).optional(),
  locale: z.enum(["tr", "en"]).optional(),
});

const complaintCapaSchema = z.object({
  action: z.literal("capa-from-complaint"),
  complaintId: z.string().min(1),
  locale: z.enum(["tr", "en"]).optional(),
});

const complaintVigilanceSchema = z.object({
  action: z.literal("vigilance-from-complaint"),
  complaintId: z.string().min(1),
  locale: z.enum(["tr", "en"]).optional(),
});

const schema = z.discriminatedUnion("action", [
  auditSchema,
  complaintCapaSchema,
  complaintVigilanceSchema,
]);

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const body = parsed.data;
    if (body.action === "capa-from-audit") {
      const result = await createCapaFromInternalAudit({
        companyId: ctx.companyId,
        auditCycleId: body.auditCycleId,
        findingTitle: body.findingTitle,
        findingDescription: body.findingDescription,
        locale: body.locale,
      });
      return NextResponse.json({ ok: true, ...result, href: `/operational/capa/${result.capaId}` });
    }

    if (body.action === "capa-from-complaint") {
      const result = await createCapaFromComplaint({
        companyId: ctx.companyId,
        complaintId: body.complaintId,
        locale: body.locale,
      });
      return NextResponse.json({ ok: true, ...result, href: `/operational/capa/${result.capaId}` });
    }

    const result = await createVigilanceFromComplaint({
      companyId: ctx.companyId,
      complaintId: body.complaintId,
      locale: body.locale,
    });
    return NextResponse.json({
      ok: true,
      ...result,
      href: `/operational/vigilance/${result.vigilanceId}`,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
