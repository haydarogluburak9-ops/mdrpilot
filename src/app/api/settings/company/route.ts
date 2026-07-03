import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

const optText = (max: number) => z.string().trim().max(max).optional().nullable();

const schema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  legalName: optText(200),
  country: optText(100),
  address: optText(500),
  contactEmail: optText(200),
  contactPhone: optText(100),
  manufacturingSites: optText(1000),
  authorizedRep: optText(500),
  srnNumber: optText(100),
  notifiedBody: optText(200),
  notifiedBodyNumber: optText(20),
});

// PUT /api/settings/company — update the manufacturer / company profile (Quality Manager+).
export async function PUT(req: Request) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const json = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const nz = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
    const d = parsed.data;

    await prisma.company.update({
      where: { id: ctx.companyId },
      data: {
        name: d.name.trim(),
        legalName: nz(d.legalName),
        country: nz(d.country),
        address: nz(d.address),
        contactEmail: nz(d.contactEmail),
        contactPhone: nz(d.contactPhone),
        manufacturingSites: nz(d.manufacturingSites),
        authorizedRep: nz(d.authorizedRep),
        srnNumber: nz(d.srnNumber),
        notifiedBody: nz(d.notifiedBody),
        notifiedBodyNumber: nz(d.notifiedBodyNumber),
      },
    });

    await writeAuditLog({
      action: "company.update",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Company",
      entityId: ctx.companyId,
      metadata: { name: d.name },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/settings/company PUT]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
