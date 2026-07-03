import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { saveEquivalentDevices } from "@/lib/products/clinical-evaluation-service";

export const runtime = "nodejs";

const pillarSchema = z.enum(["equivalent", "similar", "different", "unknown"]);

const deviceSchema = z.object({
  id: z.string().max(64),
  deviceName: z.string().max(300),
  manufacturer: z.string().max(300),
  model: z.string().max(200),
  regulatoryRef: z.string().max(300),
  deviceClass: z.string().max(100),
  intendedUse: z.string().max(2000),
  clinicalPillar: pillarSchema,
  clinicalNotes: z.string().max(2000),
  technicalPillar: pillarSchema,
  technicalNotes: z.string().max(2000),
  biologicalPillar: pillarSchema,
  biologicalNotes: z.string().max(2000),
  dataSource: z.string().max(500),
  evidenceUrl: z.string().max(500).optional(),
  fdaKNumber: z.string().max(32).optional(),
  liveVerified: z.boolean().optional(),
  liveQueryUrl: z.string().max(500).optional(),
  evidenceScreenshots: z
    .array(
      z.object({
        id: z.string().max(64),
        storageKey: z.string().max(300),
        fileName: z.string().max(200),
        mimeType: z.string().max(100),
        uploadedAt: z.string().max(40),
        caption: z.string().max(500).optional(),
      }),
    )
    .max(10)
    .optional(),
  cerComment: z.string().max(2000).optional(),
  dimensions: z.string().max(500).optional(),
  rawMaterial: z.string().max(500).optional(),
  biocompatibility: z.string().max(2000).optional(),
  sterilizationMethod: z.string().max(200).optional(),
  reusability: z.string().max(200).optional(),
  bodyContactArea: z.string().max(500).optional(),
  patientPopulation: z.string().max(1000).optional(),
  shelfLife: z.string().max(100).optional(),
  userProfile: z.string().max(500).optional(),
  contactDuration: z.string().max(200).optional(),
  indications: z.string().max(2000).optional(),
  notes: z.string().max(2000),
});

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  data: z.object({
    searchDate: z.string().max(20),
    searchQuery: z.string().max(500),
    equivalenceClaimed: z.boolean(),
    summary: z.string().max(5000).optional(),
    devices: z.array(deviceSchema).max(50),
    notes: z.string().max(2000).optional(),
  }),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const locale = parsed.data.locale ?? "tr";
    const evaluation = await saveEquivalentDevices(
      ctx.companyId,
      params.id,
      parsed.data.data,
      locale,
    );
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "clinical_evaluation.equivalents",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "ClinicalEvaluation",
      entityId: evaluation.id,
      metadata: { productId: params.id, count: parsed.data.data.devices.length },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/equivalents POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
