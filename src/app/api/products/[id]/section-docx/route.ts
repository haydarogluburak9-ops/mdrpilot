import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { loadCompanyLogo } from "@/lib/exports/logo";
import { coerceLanguage, langFileTag, tx } from "@/lib/exports/i18n";
import { buildSectionDocx } from "@/lib/exports/generators/section-docx";
import { buildSectionPdf } from "@/lib/exports/generators/section-pdf";
import { buildDeclarationDocx } from "@/lib/exports/generators/declaration-docx";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";
import { resolveTechnicalSectionExportMarkdown } from "@/lib/exports/resolve-section-export-markdown";
import { TECHNICAL_FILE_TEMPLATE } from "@/lib/domain/constants";
import { dictionaries } from "@/lib/i18n/dictionaries";

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

export const runtime = "nodejs";

function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "section"
  );
}

// GET /api/products/[id]/section-docx?sectionId=...&lang=tr|en&format=docx|pdf
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const sectionId = url.searchParams.get("sectionId") ?? "";
    const lang = coerceLanguage(url.searchParams.get("lang"));
    const formatParam = url.searchParams.get("format")?.toLowerCase();
    const format = formatParam === "pdf" ? "pdf" : "docx";

    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      include: {
        company: {
          select: {
            name: true,
            legalName: true,
            address: true,
            manufacturingSites: true,
            notifiedBody: true,
            notifiedBodyNumber: true,
            country: true,
          },
        },
        technicalSections: true,
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const section = product.technicalSections.find((s) => s.id === sectionId);
    if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    if (!section.content || !section.content.trim()) {
      if (section.key !== "doc") {
        return NextResponse.json({ error: "Section has no content yet" }, { status: 400 });
      }
    }

    const logo = await loadCompanyLogo(ctx.companyId);
    // Document number follows the CANONICAL template order (by section key) so it
    // is stable, unique and regulation-ordered, regardless of DB insertion order.
    const templateIdx = TECHNICAL_FILE_TEMPLATE.findIndex((s) => s.key === section.key);
    const docIndex = templateIdx >= 0 ? templateIdx : (section.order ?? 0);
    const documentNo = `TF-${String(docIndex + 1).padStart(2, "0")}`;

    const tKey = `tf.section.${section.key}`;
    const titleTr = dictionaries.tr[tKey] ?? section.title;
    const titleEn = dictionaries.en[tKey] ?? section.title;
    const primary = lang === "en" ? titleEn : titleTr;
    const secondary = lang === "en" ? titleTr : titleEn;

    const now = new Date();
    const todayStr = fmtDate(now);
    const revNoDisplay = String(section.revisionNo ?? 0);
    const revNoPadded = revNoDisplay.padStart(2, "0");
    const revStr = fmtDate(section.revisionDate ?? section.issueDate ?? section.createdAt ?? now);
    const issueStr = fmtDate(section.issueDate ?? now);

    if (format === "pdf" && section.key === "doc") {
      return NextResponse.json({ error: "PDF export is not available for the declaration of conformity" }, { status: 400 });
    }

    const sectionBody =
      section.key === "doc"
        ? section.content ?? ""
        : await resolveTechnicalSectionExportMarkdown({
            sectionId: section.id,
            sectionKey: section.key,
            title: section.title,
            content: section.content ?? "",
            revisionNo: section.revisionNo ?? 0,
            updatedAt: section.updatedAt,
            productName: product.name,
            companyName: product.company.name,
            companyId: ctx.companyId,
            lang,
          });

    const ext = format === "pdf" ? "pdf" : "docx";
    const mime =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    let buffer: Buffer;
    if (section.key === "doc") {
      buffer = await buildDeclarationDocx({
        company: product.company,
        product: {
          name: product.name,
          brand: product.brand,
          model: product.model,
          basicUdiDi: product.basicUdiDi,
          emdnCode: product.emdnCode,
          photoKey: product.photoKey,
          deviceClass: product.deviceClass,
          variantsJson: product.variantsJson,
          appliedStandards: product.appliedStandards,
          isSterile: product.isSterile,
          sterilization: product.sterilization,
        },
        documentNo,
        publicationDate: todayStr,
        revisionNo: "00",
        revisionDate: todayStr,
        issueDate: todayStr,
        logo,
        language: lang,
      });
    } else {
      const sectionData = {
        titlePrimary: primary,
        titleSecondary: secondary,
        annexRef: section.annexRef ?? "",
        contentMarkdown: sectionBody,
        companyName: product.company.name,
        productName: product.name,
        documentNo,
        revisionNo: revNoPadded,
        issueDate: issueStr,
        revisionDate: revStr,
        revisionHistory: Array.isArray(section.revisionHistoryJson)
          ? (section.revisionHistoryJson as unknown as { rev: number; date: string; by: string; note: string }[])
          : [],
        language: lang,
        logo,
        generatedBy: ctx.user.name ?? ctx.user.email,
        generatedAt: now,
      };
      buffer = format === "pdf" ? await buildSectionPdf(sectionData) : await buildSectionDocx(sectionData);
    }

    const fileName =
      section.key === "doc"
        ? `${documentNo} ${slug(tx(lang, "decl.fileName"))} REV00 ${langFileTag(lang).toUpperCase()}.${ext}`
        : `${documentNo} ${slug(section.title)} REV${revNoPadded} ${langFileTag(lang).toUpperCase()}.${ext}`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": contentDispositionAttachment(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/section-docx]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
