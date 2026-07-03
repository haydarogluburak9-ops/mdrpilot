import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError, NotFoundError } from "@/lib/auth/errors";
import { getUploadsStorage } from "@/lib/storage/storage-provider";

export const runtime = "nodejs";

// GET /api/company/logo — stream the active company's logo (auth + company isolation).
export async function GET() {
  try {
    const ctx = await requireCompany();
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { logoKey: true, logoMime: true },
    });
    if (!company?.logoKey) throw new NotFoundError();

    const storage = getUploadsStorage();
    if (!(await storage.exists(company.logoKey))) {
      await prisma.company.update({
        where: { id: ctx.companyId },
        data: { logoKey: null, logoMime: null },
      });
      throw new NotFoundError();
    }

    const buffer = await storage.read(company.logoKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": company.logoMime || "image/png",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/company/logo]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
