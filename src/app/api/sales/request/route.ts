import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "nodejs";

const schema = z.object({
  kind: z.enum(["purchase", "demo_trial", "token_pack"]),
  planKey: z.string().max(40).optional(),
  tokenPackKey: z.string().max(40).optional(),
  billingPeriod: z.enum(["monthly", "annual"]).optional(),
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  company: z.string().min(2).max(160),
  phone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { kind, planKey, tokenPackKey, billingPeriod, name, email, company, phone, notes } = parsed.data;
    const subject =
      kind === "demo_trial"
        ? `[${BRAND_NAME}] 3-day demo request — ${planKey ?? "Pro"}`
        : kind === "token_pack"
          ? `[${BRAND_NAME}] Token pack request — ${tokenPackKey ?? "—"}`
          : `[${BRAND_NAME}] Plan purchase request — ${planKey ?? "—"}`;

    const requestTypeLabel =
      kind === "demo_trial"
        ? "3-day demo trial"
        : kind === "token_pack"
          ? "AI token pack"
          : "Plan purchase";

    const lines = [
      `Request type: ${requestTypeLabel}`,
      kind === "token_pack" ? `Token pack: ${tokenPackKey ?? "—"}` : `Plan: ${planKey ?? "—"}`,
      billingPeriod ? `Billing: ${billingPeriod}` : null,
      `Name: ${name}`,
      `Email: ${email}`,
      `Company: ${company}`,
      phone ? `Phone: ${phone}` : null,
      ctx?.companyId ? `Existing company ID: ${ctx.companyId}` : null,
      ctx?.user.id ? `Existing user ID: ${ctx.user.id}` : null,
      "",
      notes?.trim() ? `Notes:\n${notes.trim()}` : null,
    ].filter(Boolean);

    const message = lines.join("\n");

    const ticket = await prisma.supportTicket.create({
      data: {
        companyId: ctx?.companyId ?? null,
        userId: ctx?.user?.id ?? null,
        email,
        name,
        subject,
        message,
      },
    });

    await sendEmail({
      to: env.email.supportTo,
      subject,
      text: message,
      html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${message}</pre>`,
    });

    await writeAuditLog({
      action:
        kind === "demo_trial"
          ? "sales.demo_trial"
          : kind === "token_pack"
            ? "sales.token_pack"
            : "sales.purchase",
      companyId: ctx?.companyId,
      userId: ctx?.user?.id,
      entity: "SupportTicket",
      entityId: ticket.id,
      metadata: { kind, planKey, tokenPackKey, billingPeriod },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true, id: ticket.id });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
