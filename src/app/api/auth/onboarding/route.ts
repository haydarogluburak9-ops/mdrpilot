import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { setSessionCompany } from "@/lib/auth/session";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { scaffoldCompanyQms } from "@/lib/qms/scaffold";
import { scaffoldOnboardingProducts } from "@/lib/products/onboarding-scaffold";

export const runtime = "nodejs";

const schema = z.object({
  companyName: z.string().min(1).max(160),
  country: z.string().max(80).optional(),
  srn: z.string().max(120).optional(),
  notifiedBody: z.string().max(160).optional(),
  industry: z.enum(["MEDICAL", "FOOD", "PHARMA", "OTHER"]).optional(),
  standards: z.array(z.string().max(40)).max(10).optional(),
  productCount: z.number().int().min(0).max(100000).optional(),
  goal: z.enum(["GENERATE", "GAPS", "AUDIT"]).optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Ensure a default subscription plan exists.
    const plan = await prisma.subscriptionPlan.upsert({
      where: { key: "starter" },
      update: {},
      create: {
        key: "starter",
        name: "Starter",
        priceMonthly: 0,
        maxProducts: 1,
        maxSeats: 1,
        monthlyAiTokens: 0,
      },
    });

    const { industry, standards, productCount, goal } = parsed.data;
    const profileJson =
      industry || standards || productCount !== undefined || goal
        ? { industry, standards, productCount, goal }
        : undefined;

    const company = await prisma.company.create({
      data: {
        name: parsed.data.companyName.trim(),
        country: parsed.data.country,
        srnNumber: parsed.data.srn,
        notifiedBody: parsed.data.notifiedBody,
        profileJson: profileJson as object | undefined,
        subscriptionId: plan.id,
        members: { create: { userId: ctx.user.id, role: "OWNER" } },
      },
    });

    // Scaffold the QMS document register (ISO 13485 procedures, optionally
    // ISO 9001) so the new company starts with the full regulatory checklist.
    await scaffoldCompanyQms(company.id, standards ?? []).catch(() => undefined);

    const productIds = await scaffoldOnboardingProducts(company.id, company.name, {
      productCount: productCount ?? 1,
      industry: industry ?? "MEDICAL",
    }).catch(() => [] as string[]);

    await setSessionCompany(ctx.token, company.id);
    await writeAuditLog({
      action: "company.create",
      userId: ctx.user.id,
      companyId: company.id,
      entity: "Company",
      entityId: company.id,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      ok: true,
      companyId: company.id,
      firstProductId: productIds[0] ?? null,
      redirectTo: productIds[0]
        ? `/products/${productIds[0]}?setup=1&tab=overview`
        : "/dashboard?setup=1",
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
