import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";
import { loadCompanyLogo } from "@/lib/exports/logo";
import { prisma } from "@/lib/db";
import {
  calibrationFormToPlanRow,
  parseCalibrationFormMarkdown,
} from "@/lib/operational/calibration-form-model";
import { buildCalibrationPlanDocx } from "@/lib/operational/calibration-plan-docx";

export const runtime = "nodejs";

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}


export async function GET(req: Request) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const locale = url.searchParams.get("lang") === "en" ? "en" : "tr";

    const records = await prisma.qmsOperationalRecord.findMany({
      where: { companyId: ctx.companyId, module: "CALIBRATION" },
      orderBy: [{ referenceNo: "asc" }, { title: "asc" }],
    });

    if (records.length === 0) {
      return NextResponse.json({ error: locale === "tr" ? "Kayıt bulunamadı" : "No records found" }, { status: 400 });
    }

    const rows = records.map((r, idx) => {
      const content = r.formContent?.trim() ?? "";
      const parsed = content
        ? parseCalibrationFormMarkdown(content, locale)
        : parseCalibrationFormMarkdown("", locale);
      if (!parsed.deviceCode && r.referenceNo) parsed.deviceCode = r.referenceNo;
      if (!parsed.deviceName) parsed.deviceName = r.title;
      if (!parsed.responsiblePerson && r.ownerName) parsed.responsiblePerson = r.ownerName;
      if (!parsed.nextCalibrationDate && r.dueDate) {
        const d = r.dueDate;
        parsed.nextCalibrationDate = `${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
      }
      return calibrationFormToPlanRow(parsed, idx + 1, r.title, locale);
    });

    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { name: true, legalName: true },
    });
    const logo = await loadCompanyLogo(ctx.companyId);
    const now = new Date();

    const buffer = await buildCalibrationPlanDocx({
      companyName: company?.legalName ?? company?.name ?? "Company",
      logo,
      documentDate: fmtDate(now),
      rows,
      locale,
    });

    const fileName = locale === "tr" ? "KALIBRASYON-PLANI.docx" : "CALIBRATION-PLAN.docx";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": contentDispositionAttachment(fileName),
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/calibration/plan-export]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
