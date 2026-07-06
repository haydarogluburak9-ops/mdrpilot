import "server-only";
import PDFDocument from "pdfkit";
import type { ExportJob } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage/storage-provider";
import { writeAuditLog } from "@/lib/audit";
import { NotFoundError } from "@/lib/auth/errors";
import { DISCLAIMER } from "@/lib/domain/constants";
import { FORMAT_EXT } from "@/lib/exports/types";
import { tx, generatedLine, coerceLanguage, langFileTag, type ExportLanguage } from "@/lib/exports/i18n";
import { loadCompanyLogo, type CompanyLogo } from "@/lib/exports/logo";
import { runConsultantAnalysis } from "./engine";
import { localizeConsultantForExport, formatGapSeverityForPdf } from "./export-localize";
import { loadExecutiveData } from "./executive";
import type { ComplianceStandardScope } from "./types";

function buildPdf(opts: {
  companyName: string;
  productName: string | null;
  exec: Awaited<ReturnType<typeof loadExecutiveData>>;
  consult: Awaited<ReturnType<typeof runConsultantAnalysis>>;
  generatedBy: string;
  generatedAt: Date;
  language: ExportLanguage;
  logo: CompanyLogo | null;
}): Promise<Buffer> {
  const { exec, consult } = opts;
  const lang = opts.language;
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    try {
      if (opts.logo) {
        const top = pdf.y;
        try { pdf.image(opts.logo.data, 50, top, { height: 36 }); pdf.y = top + 42; } catch { /* ignore bad image */ }
      }
      pdf.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(16).text(tx(lang, "exec.title"));
      pdf.fillColor("#6b7280").font("Helvetica").fontSize(9)
        .text(`${opts.companyName}${opts.productName ? ` · ${opts.productName}` : ""} · ${generatedLine(lang, opts.generatedAt.toISOString().slice(0, 10), opts.generatedBy)}`);
      pdf.moveDown(0.6);

      // Company overview
      pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(tx(lang, "exec.companyOverview"));
      pdf.font("Helvetica").fontSize(10).fillColor("#374151")
        .text(`${tx(lang, "exec.products")}: ${exec.productsTotal}  ·  ${tx(lang, "exec.atRisk")}: ${exec.productsAtRisk}  ·  ${tx(lang, "exec.openCapa")}: ${exec.openCapa} (${exec.overdueCapa} ${tx(lang, "exec.overdue")})  ·  ${tx(lang, "exec.majorFindings")}: ${exec.majorFindings}`)
        .text(`${tx(lang, "exec.evidenceCoverage")}: ${exec.evidenceCoverage}%  ·  ${tx(lang, "exec.completedAudits")}: ${exec.completedAudits}`);
      pdf.moveDown(0.4);

      // Readiness
      pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(tx(lang, "exec.readiness"));
      pdf.font("Helvetica-Bold").fontSize(26).fillColor(consult.overallScore >= 80 ? "#16a34a" : consult.overallScore >= 50 ? "#f59e0b" : "#dc2626")
        .text(`${consult.overallScore}/100`);
      pdf.font("Helvetica").fontSize(10).fillColor("#374151").text(consult.summary);
      pdf.moveDown(0.4);

      // Top 5 gaps
      pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(tx(lang, "exec.top5"));
      consult.gaps.slice(0, 5).forEach((g, i) => {
        const sev = formatGapSeverityForPdf(g.severity, lang);
        pdf.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(`${i + 1}. [${sev}] ${g.title} (${g.standard} ${g.clause})`);
        pdf.font("Helvetica").fontSize(9).fillColor("#6b7280").text(`   ${g.recommendedAction}`);
      });
      pdf.moveDown(0.4);

      // 30 day plan
      pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(tx(lang, "exec.plan30"));
      consult.roadmap.forEach((w) => {
        pdf.font("Helvetica-Bold").fontSize(10).fillColor("#1d4ed8").text(`${tx(lang, "exec.week")} ${w.week}: ${w.focus}`).fillColor("#111827");
        pdf.font("Helvetica").fontSize(9);
        w.items.forEach((it) => pdf.text(`   • ${it}`));
      });
      pdf.moveDown(0.4);

      // Audit simulation summary
      pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(tx(lang, "exec.auditSummary"));
      pdf.font("Helvetica").fontSize(10).fillColor("#374151")
        .text(`${tx(lang, "exec.auditsInProgress")}: ${exec.auditsInProgress}  ·  ${tx(lang, "exec.completed")}: ${exec.completedAudits}`);
      if (exec.auditTrend.length) {
        pdf.text(`${tx(lang, "exec.latestScore")}: ${exec.auditTrend[exec.auditTrend.length - 1].score}/100`);
      } else {
        pdf.text(tx(lang, "exec.noAudits"));
      }
      pdf.moveDown(0.4);

      // Recommended next actions
      pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(tx(lang, "exec.nextActions"));
      pdf.font("Helvetica").fontSize(10).fillColor("#374151");
      consult.topActions.slice(0, 5).forEach((a, i) => pdf.text(`${i + 1}. ${a.title} (${tx(lang, "exec.impact")} ${a.impact}, ${tx(lang, "exec.effort")} ${a.effort})`));
      pdf.moveDown(0.4);

      // ROI
      pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(tx(lang, "exec.roiTitle"));
      pdf.font("Helvetica").fontSize(10).fillColor("#374151").text(tx(lang, "exec.roiBody"));

      pdf.moveDown(1).moveTo(50, pdf.y).lineTo(545, pdf.y).strokeColor("#f59e0b").stroke().moveDown(0.4);
      pdf.fillColor("#92400e").font("Helvetica-Oblique").fontSize(8).text(`${tx(lang, "disclaimerPrefix")}: ${DISCLAIMER}`);
      pdf.end();
    } catch (err) { reject(err); }
  });
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "executive";
}

export async function createDemoExecutiveExport(params: { companyId: string; userId: string; productId?: string | null; standard?: ComplianceStandardScope; ip?: string | null; language?: ExportLanguage }): Promise<ExportJob> {
  const company = await prisma.company.findUnique({ where: { id: params.companyId }, select: { name: true } });
  if (!company) throw new NotFoundError();
  const language = coerceLanguage(params.language);

  const job = await prisma.exportJob.create({
    data: { companyId: params.companyId, productId: params.productId ?? null, createdById: params.userId, type: "DEMO_EXECUTIVE_REPORT_PDF", format: "PDF", status: "PROCESSING" },
  });

  try {
    const [exec, consult, u, logo] = await Promise.all([
      loadExecutiveData(params.companyId),
      runConsultantAnalysis(params.companyId, params.standard ?? "COMBINED", params.productId ?? null),
      prisma.user.findUnique({ where: { id: params.userId }, select: { name: true, email: true } }),
      loadCompanyLogo(params.companyId),
    ]);

    const generatedAt = new Date();
    const buffer = await buildPdf({
      companyName: company.name, productName: consult.productName,
      exec, consult: localizeConsultantForExport(consult, language),
      generatedBy: u?.name ?? u?.email ?? "—", generatedAt, language, logo,
    });

    const ext = FORMAT_EXT.PDF;
    const displayName = `${slug(`${company.name}-executive-report`)}-${langFileTag(language)}-${generatedAt.toISOString().slice(0, 10)}.${ext}`;
    const key = `${params.companyId}/${job.id}.${ext}`;
    const saved = await getStorage().save(key, buffer);

    const done = await prisma.exportJob.update({
      where: { id: job.id }, data: { status: "COMPLETED", fileKey: key, fileName: displayName, sizeBytes: saved.size },
    });
    await writeAuditLog({
      action: "export.create", userId: params.userId, companyId: params.companyId,
      entity: "ExportJob", entityId: job.id, metadata: { type: "DEMO_EXECUTIVE_REPORT_PDF", size: saved.size, language }, ip: params.ip,
    });
    return done;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Executive report export failed";
    const failed = await prisma.exportJob.update({ where: { id: job.id }, data: { status: "FAILED", errorMessage: message.slice(0, 500) } });
    await writeAuditLog({
      action: "export.failed", userId: params.userId, companyId: params.companyId,
      entity: "ExportJob", entityId: job.id, metadata: { type: "DEMO_EXECUTIVE_REPORT_PDF", error: message.slice(0, 200) }, ip: params.ip,
    });
    return failed;
  }
}
