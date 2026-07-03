import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError, NotFoundError, BadRequestError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { loadCompanyLogo } from "@/lib/exports/logo";
import { coerceLanguage } from "@/lib/exports/i18n";
import { buildSectionDocx } from "@/lib/exports/generators/section-docx";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";
import { getQualityManualWizard } from "@/lib/data/queries";
import {
  buildOrganizationExportMarkdown,
  organizationExportHasContent,
} from "@/lib/wizards/quality-manual/organization-export";

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "organizasyon"
  );
}

export const runtime = "nodejs";

// GET /api/wizards/quality-manual/[id]/organization-docx?lang=tr — Word export of organization structure, chart and roles.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const langParam = coerceLanguage(url.searchParams.get("lang"));
    const lang: "tr" | "en" = langParam === "en" ? "en" : "tr";

    const session = await getQualityManualWizard(ctx.companyId, params.id);
    if (!session) throw new NotFoundError();

    const answers = session.answers ?? {};
    if (!organizationExportHasContent(answers)) {
      throw new BadRequestError(
        lang === "tr"
          ? "Organizasyon içeriği yok. Rolleri doldurun veya AI ile oluşturun."
          : "No organization content. Fill roles or generate with AI.",
      );
    }

    const company = await prisma.company.findFirst({
      where: { id: ctx.companyId },
      select: { name: true, legalName: true },
    });

    const markdown = buildOrganizationExportMarkdown(answers, lang);
    if (!markdown.trim()) {
      throw new BadRequestError(
        lang === "tr" ? "Word dosyası oluşturulamadı." : "Could not build Word document.",
      );
    }

    const logo = await loadCompanyLogo(ctx.companyId);
    const now = new Date();
    const companyName = company?.name ?? "Company";
    const titlePrimary =
      lang === "tr" ? "Organizasyon Yapısı, Şema ve Roller" : "Organization Structure, Chart and Roles";
    const documentNo = "QM-ORG";
    const revisionNo = "00";
    const dateStr = fmtDate(now);
    const generatedBy = ctx.user.name ?? ctx.user.email;

    const buffer = await buildSectionDocx({
      titlePrimary,
      titleSecondary: titlePrimary,
      annexRef: "ISO 13485:2016 — 5.5",
      contentMarkdown: markdown,
      companyName,
      productName: null,
      documentNo,
      revisionNo,
      issueDate: dateStr,
      revisionDate: dateStr,
      revisionHistory: [],
      language: lang,
      logo,
      generatedBy,
      generatedAt: now,
    });

    const fileName = `${documentNo} ${slug(titlePrimary)} REV${revisionNo}.docx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": contentDispositionAttachment(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual/organization-docx]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
