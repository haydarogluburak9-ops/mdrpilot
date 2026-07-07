import "server-only";
import { prisma } from "@/lib/db";
import { loadCompanyLogo } from "@/lib/exports/logo";
import { exportLangToUiLang } from "@/lib/exports/i18n";
import { binaryContentLang } from "@/lib/i18n/locales";
import { normalizeRiskDocMarkdown } from "@/lib/domain/risk-markdown-normalize";
import { resolveLocalizedMarkdown } from "@/lib/exports/localized-markdown";
import { buildSectionDocx } from "@/lib/exports/generators/section-docx";
import { RISK_FORM_META } from "@/lib/domain/risk-management-templates";
import { injectPlanApprovalBlock } from "@/lib/domain/risk-plan-table-e-markdown";
import { injectPlanRiskMatrixBlock, buildRiskMatrixPlanSection } from "@/lib/domain/risk-plan-risk-matrix";
import { annexAHasAnswers, parseAnnexARowsJson, type RiskAnnexARow } from "@/lib/domain/risk-annex-a";
import type { CompanyContext } from "@/lib/auth/guards";

export type RiskDocKind = "plan" | "policy" | "report" | "annexA";

function cellText(s: string) {
  return s.replace(/\|/g, "/").replace(/\n/g, " ").trim();
}

function annexRowsToMarkdown(rows: RiskAnnexARow[], lang: string): string {
  const headers =
    lang === "en"
      ? ["No.", "Characteristic", "Question", "Answer", "Approved"]
      : ["No", "Özellik", "Soru", "Cevap", "Onay"];
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];
  for (const r of rows) {
    const approved = r.approved
      ? lang === "en"
        ? "Yes"
        : "Evet"
      : lang === "en"
        ? "No"
        : "Hayır";
    lines.push(
      `| ${cellText(r.no)} | ${cellText(r.characteristic)} | ${cellText(r.question)} | ${cellText(r.answer)} | ${approved} |`,
    );
  }
  return lines.join("\n");
}

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
      .slice(0, 40) || "risk-doc"
  );
}

export async function buildRiskDocxBuffer(
  ctx: CompanyContext,
  productId: string,
  kind: RiskDocKind,
  lang: "tr" | "en" = "tr",
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const exportLang = lang === "en" ? "en" : "tr";
  const contentLocale = binaryContentLang(lang);

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId: ctx.companyId, deletedAt: null },
    include: {
      company: { select: { name: true } },
      riskManagementFile: true,
    },
  });
  if (!product) return null;

  const rm = product.riskManagementFile;
  let content: string | null | undefined;
  let metaKey: "plan" | "report" | "policy" | "annexA";

  if (kind === "annexA") {
    const rows = parseAnnexARowsJson(rm?.annexARows, contentLocale);
    if (!annexAHasAnswers(rows)) return null;
    content = annexRowsToMarkdown(rows, contentLocale);
    metaKey = "annexA";
  } else {
    content =
      kind === "plan"
        ? rm?.plan
        : kind === "report"
          ? rm?.report
          : rm?.managementPolicy;
    metaKey = kind;
  }

  if (!content?.trim()) return null;

  const now = new Date();
  content = normalizeRiskDocMarkdown(content);
  content = await resolveLocalizedMarkdown({
    markdown: content,
    targetLocale: lang,
    entityKey: `risk-${kind}:${product.id}`,
    revisionToken: rm?.updatedAt?.toISOString() ?? now.toISOString(),
    context: { title: metaKey, companyName: product.company.name },
    companyId: ctx.companyId,
  });

  if (kind === "plan") {
    const loc = lang === "en" ? "en" : "tr";
    const fmeaRef = `${RISK_FORM_META.fmea.formNo} Rev.${RISK_FORM_META.fmea.rev}`;
    const reportRef = `${RISK_FORM_META.report.formNo} Rev.${RISK_FORM_META.report.rev}`;
    content = injectPlanRiskMatrixBlock(content, buildRiskMatrixPlanSection(loc, fmeaRef, reportRef));
    content = injectPlanApprovalBlock(content, fmtDate(now), loc);
  }

  const meta = RISK_FORM_META[metaKey];
  const primary = lang === "en" ? meta.titleEn : meta.titleTr;
  const secondary = lang === "en" ? meta.titleTr : meta.titleEn;
  const revPadded = meta.rev.padStart(2, "0");
  const logo = await loadCompanyLogo(ctx.companyId);

  const buffer = await buildSectionDocx({
    titlePrimary: primary,
    titleSecondary: secondary,
    annexRef: "ISO 14971:2019",
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
        note: lang === "tr" ? "AI taslağı" : "AI draft",
      },
    ],
    language: exportLang,
    logo,
    generatedBy: ctx.user.name ?? ctx.user.email,
    generatedAt: now,
  });

  const fileName = `${meta.formNo} ${slug(primary)} REV${revPadded}.docx`;
  return { buffer, fileName };
}
