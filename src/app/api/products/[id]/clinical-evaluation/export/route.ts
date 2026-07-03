import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { loadCompanyLogo } from "@/lib/exports/logo";
import { coerceLanguage } from "@/lib/exports/i18n";
import { buildSectionDocx } from "@/lib/exports/generators/section-docx";
import { buildSectionPdf } from "@/lib/exports/generators/section-pdf";
import { buildZip, type ZipEntry } from "@/lib/exports/generators/zip-generator";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";
import { CLINICAL_FORM_META } from "@/lib/domain/clinical-cer-meta";
import { CLINICAL_SECTION_KEYS } from "@/lib/domain/clinical-evaluation";
import { enrichCerExportMarkdown } from "@/lib/domain/clinical-cer-premium";
import { resolveLocalizedMarkdown } from "@/lib/exports/localized-markdown";
import { parseLiteratureSearchJson } from "@/lib/domain/clinical-literature-model";
import { parseCerRevisionHistory } from "@/lib/products/clinical-evaluation-workflow";
import { getClinicalEvaluationForExport, resolveCerExportSections } from "@/lib/products/clinical-evaluation-service";

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
      .slice(0, 40) || "cer"
  );
}

type ExportLang = "tr" | "en";
type ExportFormat = "docx" | "pdf" | "zip";

async function buildCerBuffer(
  product: NonNullable<Awaited<ReturnType<typeof getClinicalEvaluationForExport>>>,
  cer: NonNullable<typeof product.clinicalEvaluation>,
  lang: ExportLang,
  format: "docx" | "pdf",
  ctx: Awaited<ReturnType<typeof requireCompany>>,
): Promise<{ buffer: Buffer; fileName: string; mime: string }> {
  const sections = await resolveCerExportSections(product.id, cer, lang);
  const literatureData = parseLiteratureSearchJson(cer.literatureDataJson);
  const rawContent = enrichCerExportMarkdown(sections, lang, product.name, {
    preparedAt: literatureData?.preparedAt || literatureData?.searchDate,
    searchDate: literatureData?.searchDate,
    approval: {
      status: cer.status,
      submittedBy: cer.submittedBy?.name ?? cer.submittedBy?.email ?? null,
      approvedBy: cer.approvedBy?.name ?? cer.approvedBy?.email ?? null,
      approvedAt: cer.approvedAt?.toISOString() ?? null,
      revisionNo: cer.revisionNo ?? 0,
      revisionHistory: parseCerRevisionHistory(cer.revisionHistoryJson),
    },
  });

  const content = await resolveLocalizedMarkdown({
    markdown: rawContent,
    targetLocale: lang,
    entityKey: `cer:${product.id}`,
    revisionToken: `${cer.revisionNo ?? 0}:${cer.updatedAt.toISOString()}`,
    context: { title: "CER", companyName: product.company.name },
    companyId: ctx.companyId,
  });

  const meta = CLINICAL_FORM_META.cer;
  const titleTr = meta.titleTr;
  const titleEn = meta.titleEn;
  const primary = lang === "en" ? titleEn : titleTr;
  const secondary = lang === "en" ? titleTr : titleEn;
  const revPadded = meta.rev.padStart(2, "0");
  const now = new Date();
  const logo = await loadCompanyLogo(ctx.companyId);

  const sectionData = {
    titlePrimary: primary,
    titleSecondary: secondary,
    annexRef: meta.annexRef,
    contentMarkdown: content,
    companyName: product.company.name,
    productName: product.name,
    documentNo: meta.formNo,
    revisionNo: revPadded,
    issueDate: fmtDate(now),
    revisionDate: fmtDate(now),
    revisionHistory: [
      {
        rev: Number(meta.rev) || 1,
        date: now.toISOString().slice(0, 10),
        by: ctx.user.name ?? ctx.user.email,
        note: lang === "tr" ? "CER taslağı" : "CER draft",
      },
    ],
    language: lang,
    logo,
    generatedBy: ctx.user.name ?? ctx.user.email,
    generatedAt: now,
  };

  const buffer =
    format === "pdf" ? await buildSectionPdf(sectionData) : await buildSectionDocx(sectionData);

  const ext = format === "pdf" ? "pdf" : "docx";
  const mime =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const langTag = lang === "en" ? "EN" : "TR";
  const fileName = `${meta.formNo} ${slug(primary)} REV${revPadded} ${langTag}.${ext}`;

  return { buffer, fileName, mime };
}

export const runtime = "nodejs";

// GET /api/products/[id]/clinical-evaluation/export?format=docx|pdf|zip&lang=tr|en|both
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const formatParam = url.searchParams.get("format") ?? "docx";
    const langParam = url.searchParams.get("lang");

    if (formatParam !== "docx" && formatParam !== "pdf" && formatParam !== "zip") {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
    const format = formatParam as ExportFormat;

    const product = await getClinicalEvaluationForExport(ctx.companyId, params.id);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const cer = product.clinicalEvaluation;
    if (!cer) {
      return NextResponse.json({ error: "No clinical evaluation — generate draft first" }, { status: 400 });
    }

    const langs: ExportLang[] =
      langParam === "both" || format === "zip"
        ? ["tr", "en"]
        : [coerceLanguage(langParam) === "en" ? "en" : "tr"];

    for (const lang of langs) {
      const sections = await resolveCerExportSections(params.id, cer, lang);
      const hasContent = CLINICAL_SECTION_KEYS.some((k) => sections[k]?.trim());
      if (!hasContent) {
        return NextResponse.json({ error: "CER sections are empty" }, { status: 400 });
      }
    }

    if (format === "zip") {
      const entries: ZipEntry[] = [];
      for (const lang of langs) {
        const { buffer, fileName } = await buildCerBuffer(product, cer, lang, "docx", ctx);
        entries.push({ name: fileName, buffer });
      }
      const zipBuffer = await buildZip(entries);
      const meta = CLINICAL_FORM_META.cer;
      const zipName = `${meta.formNo} CER TR-EN REV${meta.rev.padStart(2, "0")}.zip`;
      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": contentDispositionAttachment(zipName),
          "Cache-Control": "no-store",
        },
      });
    }

    const lang = langs[0];
    const { buffer, fileName, mime } = await buildCerBuffer(
      product,
      cer,
      lang,
      format,
      ctx,
    );

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
    if (status === 500) console.error("[api/clinical-evaluation/export GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
