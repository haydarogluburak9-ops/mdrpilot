import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError, BadRequestError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { updateWizardSession } from "@/lib/wizards/quality-manual/service";
import { generateOrganizationFromRoles } from "@/lib/wizards/quality-manual/organization-ai-generate";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  answers: z.record(z.unknown()).optional(),
});

// POST — generate organization structure, chart and roles matrix from filled role names.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const locale = parsed.data.locale ?? "tr";
    const answers = parsed.data.answers ?? {};

    if (!str(answers.generalManager) || !str(answers.managementRepresentative) || !str(answers.qualityManager)) {
      throw new BadRequestError(
        locale === "tr"
          ? "Genel müdür, yönetim temsilcisi ve kalite müdürü zorunludur."
          : "General manager, management representative and quality manager are required.",
      );
    }

    const { patch, source } = await generateOrganizationFromRoles({
      companyId: ctx.companyId,
      locale,
      answers,
    });

    const session = await updateWizardSession({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      id: params.id,
      answers: patch,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      answers: patch,
      source,
      session: { id: session.id, currentStep: session.currentStep, status: session.status },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual/organization-ai]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
