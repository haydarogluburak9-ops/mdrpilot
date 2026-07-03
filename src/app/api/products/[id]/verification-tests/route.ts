import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import {
  loadVerificationTests,
  saveVerificationTests,
} from "@/lib/products/verification-tests-service";
import type { VerificationTestRecord } from "@/lib/domain/verification-tests";

export const runtime = "nodejs";

const testSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    "BIOCOMPATIBILITY",
    "STERILIZATION",
    "PACKAGING",
    "ELECTRICAL",
    "MECHANICAL",
    "SOFTWARE",
    "CLINICAL",
    "OTHER",
  ]),
  title: z.string().min(1).max(500),
  standardRef: z.string().max(300).optional().nullable(),
  protocolRef: z.string().max(300).optional().nullable(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "PASS", "FAIL", "NA"]),
  resultSummary: z.string().max(4000).optional().nullable(),
  performedAt: z.string().optional().nullable(),
  evidenceFileIds: z.array(z.string()).optional(),
});

const patchSchema = z.object({
  tests: z.array(testSchema),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const data = await loadVerificationTests(ctx.companyId, params.id);
    if (!data) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/verification-tests GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const result = await saveVerificationTests(
      ctx.companyId,
      params.id,
      parsed.data.tests as VerificationTestRecord[],
    );
    if (!result) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/verification-tests PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
