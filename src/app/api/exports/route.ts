import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCompany, requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { ipFromRequest } from "@/lib/audit";
import { createExport, listExports } from "@/lib/exports/export-service";
import { EXPORT_TYPES } from "@/lib/exports/types";

export const runtime = "nodejs";

const ifuContentSchema = z
  .object({
    productDescription: z.string().optional(),
    technicalSpecifications: z.string().optional(),
    intendedPurpose: z.string().optional(),
    intendedUsers: z.string().optional(),
    patientPopulation: z.string().optional(),
    clinicalBenefits: z.string().optional(),
    indications: z.string().optional(),
    contraindications: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    precautions: z.array(z.string()).optional(),
    instructions: z.string().optional(),
    biocompatibility: z.string().optional(),
    storage: z.string().optional(),
    shelfLifeDetail: z.string().optional(),
    sterilityInfo: z.string().optional(),
    disposal: z.string().optional(),
    wasteSeparation: z.string().optional(),
    mdrAnnexIDeclaration: z.string().optional(),
    incidentReporting: z.string().optional(),
    troubleshooting: z.array(z.string()).optional(),
    symbolsGlossary: z.array(z.string()).optional(),
    regulatoryInfo: z.string().optional(),
    revisionHistory: z.string().optional(),
  })
  .optional();

const createSchema = z.object({
  productId: z.string().min(1).optional(),
  type: z.enum(EXPORT_TYPES as [string, ...string[]]),
  language: z.enum(["tr", "en", "de", "fr"]).optional(),
  modelRefs: z.array(z.string()).optional(),
  ifuContent: ifuContentSchema,
  labelCaution: z.string().optional(),
});

// GET /api/exports — company-scoped export history (any role).
export async function GET() {
  try {
    const ctx = await requireCompany();
    const exports = await listExports(ctx.companyId);
    return NextResponse.json({ exports });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/exports GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/exports — create an export (min role CONSULTANT; Viewers cannot create).
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");

    if (!rateLimit(clientKey(req, "export")).ok) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const job = await createExport({
      companyId: ctx.companyId,
      productId: parsed.data.productId,
      type: parsed.data.type as never,
      userId: ctx.user.id,
      ip: ipFromRequest(req),
      language: parsed.data.language,
      exportOptions: {
        modelRefs: parsed.data.modelRefs,
        ifuContent: parsed.data.ifuContent,
        labelCaution: parsed.data.labelCaution,
      },
    });

    if (job.status === "FAILED") {
      return NextResponse.json({ error: job.errorMessage ?? "Export failed", job }, { status: 422 });
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/exports POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
