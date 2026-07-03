import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { saveLiteratureData } from "@/lib/products/clinical-evaluation-service";
import { generatePreparedClinicalFindings } from "@/lib/products/clinical-findings-service";

export const runtime = "nodejs";

const prismaCountsSchema = z.object({
  identified: z.number().int().min(0).default(0),
  duplicatesRemoved: z.number().int().min(0).default(0),
  screened: z.number().int().min(0).default(0),
  excludedScreen: z.number().int().min(0).default(0),
  fullTextAssessed: z.number().int().min(0).default(0),
  excludedFullText: z.number().int().min(0).default(0),
  included: z.number().int().min(0).default(0),
});

const evidenceScreenshotSchema = z.object({
  id: z.string().max(64),
  storageKey: z.string().max(300),
  fileName: z.string().max(200),
  mimeType: z.string().max(100),
  uploadedAt: z.string().max(40),
  caption: z.string().max(500).optional(),
});

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  literatureData: z.object({
    population: z.string().max(2000),
    intervention: z.string().max(500),
    comparator: z.string().max(2000),
    outcomes: z.string().max(2000),
    databases: z.array(z.string().max(100)).max(20),
    searchQuery: z.string().max(4000),
    searchDate: z.string().max(20),
    inclusionCriteria: z.string().max(8000),
    exclusionCriteria: z.string().max(8000),
    prisma: prismaCountsSchema,
    notes: z.string().max(8000),
    literatureSummary: z.string().max(12000).optional(),
    registryResults: z
      .array(
        z.object({
          registryId: z.string().max(100),
          query: z.string().max(500),
          status: z.enum(["no_signal", "review_required", "records_found"]),
          summary: z.string().max(8000),
          recordsScreened: z.number().int().min(0).optional(),
          cerComment: z.string().max(2000).optional(),
          evidenceUrl: z.string().max(500).optional(),
          liveVerified: z.boolean().optional(),
          liveQueryUrl: z.string().max(800).optional(),
          liveRecordCount: z.number().int().min(0).optional(),
          sampleHits: z.array(z.string().max(500)).max(10).optional(),
          evidenceScreenshots: z.array(evidenceScreenshotSchema).max(10).optional(),
        }),
      )
      .max(30)
      .optional(),
    includedStudies: z
      .array(
        z.object({
          index: z.number().int().min(1),
          databaseId: z.string().max(100),
          citation: z.string().max(2000),
          design: z.string().max(200),
          year: z.string().max(20),
          outcomes: z.string().max(2000),
          quality: z.enum(["HIGH", "MED", "LOW"]).optional(),
          cerComment: z.string().max(2000).optional(),
          evidenceUrl: z.string().max(500).optional(),
        }),
      )
      .max(100)
      .optional(),
    preparedByMedDoc: z.boolean().optional(),
    preparedAt: z.string().max(40).optional(),
    liveLiteratureSearch: z.boolean().optional(),
    liveSearchAt: z.string().max(40).optional(),
    pubmedQueryUrl: z.string().max(800).optional(),
    pubmedTotal: z.number().int().min(0).optional(),
    evidenceScreenshots: z.array(evidenceScreenshotSchema).max(10).optional(),
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
    const evaluation = await saveLiteratureData(
      ctx.companyId,
      params.id,
      parsed.data.literatureData,
      locale,
    );
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const withFindings = await generatePreparedClinicalFindings(
      ctx.companyId,
      params.id,
      locale,
      { merge: true },
    );

    await writeAuditLog({
      action: "clinical_evaluation.literature",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "ClinicalEvaluation",
      entityId: evaluation.id,
      metadata: { productId: params.id },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ evaluation: withFindings ?? evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/literature POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
