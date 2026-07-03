import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import {
  getRiskManagementFile,
  upsertRiskManagementFile,
} from "@/lib/products/risk-management-service";

export const runtime = "nodejs";

const annexARowSchema = z.object({
  id: z.string().min(1).max(20),
  no: z.string().max(20),
  characteristic: z.string().max(500),
  question: z.string().max(2000),
  answer: z.string().max(4000),
  approved: z.boolean().optional(),
});

const tableERowSchema = z.object({
  id: z.string().min(1).max(20),
  table: z.enum(["E1", "E2"]),
  categoryTr: z.string().max(200),
  categoryEn: z.string().max(200),
  groupTr: z.string().max(200).optional(),
  groupEn: z.string().max(200).optional(),
  hazardTr: z.string().max(500),
  hazardEn: z.string().max(500),
  status: z.enum(["A", "N/A", ""]).optional(),
  justificationTr: z.string().max(4000).optional(),
  justificationEn: z.string().max(4000).optional(),
  linkedRiskNo: z.string().max(32).optional(),
});

const patchSchema = z.object({
  plan: z.string().max(50000).optional().nullable(),
  report: z.string().max(50000).optional().nullable(),
  managementPolicy: z.string().max(50000).optional().nullable(),
  annexARows: z.array(annexARowSchema).optional().nullable(),
  planTableE1Rows: z.array(tableERowSchema).optional().nullable(),
  planTableE2Rows: z.array(tableERowSchema).optional().nullable(),
  fmeaBenefitRiskAnalysis: z.string().max(8000).optional().nullable(),
  planUploadedFileId: z.string().min(1).optional().nullable(),
  reportUploadedFileId: z.string().min(1).optional().nullable(),
  policyUploadedFileId: z.string().min(1).optional().nullable(),
});

// GET /api/products/[id]/risk-management
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("VIEWER");
    const file = await getRiskManagementFile(ctx.companyId, params.id);
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ file });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id]/risk-management GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// PATCH /api/products/[id]/risk-management — CONSULTANT+
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const file = await upsertRiskManagementFile(ctx.companyId, params.id, {
      ...parsed.data,
      planTableE1Rows: parsed.data.planTableE1Rows?.map((r) => ({
        ...r,
        status: r.status ?? "",
        justificationTr: r.justificationTr ?? "",
        justificationEn: r.justificationEn ?? "",
        linkedRiskNo: r.linkedRiskNo ?? "",
      })),
      planTableE2Rows: parsed.data.planTableE2Rows?.map((r) => ({
        ...r,
        status: r.status ?? "",
        justificationTr: r.justificationTr ?? "",
        justificationEn: r.justificationEn ?? "",
        linkedRiskNo: r.linkedRiskNo ?? "",
      })),
    });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "risk_management.update",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "RiskManagementFile",
      entityId: file.id || params.id,
      metadata: { productId: params.id, fields: Object.keys(parsed.data) },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ file });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id]/risk-management PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
