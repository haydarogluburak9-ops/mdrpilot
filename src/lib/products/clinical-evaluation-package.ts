import "server-only";
import { prisma } from "@/lib/db";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { POST_MARKET_SECTION_KEYS } from "@/lib/domain/post-market-mdcg-outlines";
import { parseLiteratureSearchJson } from "@/lib/domain/clinical-literature-model";
import { parseEquivalentDevicesJson } from "@/lib/domain/clinical-equivalent-model";
import { parseClinicalQpDocuments } from "@/lib/domain/clinical-qp-documents";
import { buildSectionDocx } from "@/lib/exports/generators/section-docx";
import { loadCompanyLogo } from "@/lib/exports/logo";
import type { ZipEntry } from "@/lib/exports/generators/zip-generator";
import type { CompanyContext } from "@/lib/auth/guards";
import {
  buildCerExportBuffer,
  buildCepExportBuffer,
} from "@/lib/products/clinical-export-buffers";
import { getClinicalEvaluationForExport } from "@/lib/products/clinical-evaluation-service";
import { buildRiskDocxBuffer } from "@/lib/products/risk-export-buffer";
import { readLiteratureEvidenceBuffer } from "@/lib/products/literature-evidence";
import { readAcceptedArticleBuffer } from "@/lib/products/clinical-article-evidence";
import { readQpEvidenceBuffer } from "@/lib/products/clinical-qp-evidence";
import { readEquivalentEvidenceBuffer } from "@/lib/products/equivalent-evidence";

function packageDateFolder(d = new Date()): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

function safeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim() || "file";
}

function push(entries: ZipEntry[], folder: string, fileName: string, buffer: Buffer) {
  entries.push({ name: `${folder}/${safeName(fileName)}`, buffer });
}

function variantsMarkdown(product: {
  name: string;
  variantsJson: unknown;
}): string {
  const v = product.variantsJson as
    | { brands?: Array<{ name?: string; models?: Array<{ code?: string; sterilizations?: string[] }> }> }
    | null
    | undefined;
  const brands = v?.brands ?? [];
  if (!brands.length) {
    return `## Ürün ailesi\n\nTek ürün kaydı: **${product.name}**`;
  }
  const lines = ["## Ürün ailesi / varyant listesi", ""];
  for (const b of brands) {
    lines.push(`### Marka: ${b.name ?? "—"}`);
    for (const m of b.models ?? []) {
      const ster = (m.sterilizations ?? []).join(", ") || "—";
      lines.push(`- Model: **${m.code ?? "—"}** · Sterilizasyon: ${ster}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function buildProductProfileDocx(
  product: {
    name: string;
    brand: string | null;
    model: string | null;
    deviceClass: string;
    intendedPurpose: string | null;
    indications: string | null;
    contraindications: string | null;
    materials: string | null;
    emdnCode: string | null;
    basicUdiDi: string | null;
    udiDi: string | null;
    variantsJson: unknown;
    company: { name: string };
  },
  ctx: CompanyContext,
): Promise<Buffer> {
  const now = new Date();
  const md = [
    "## Ürün bilgileri özeti",
    "",
    `| Alan | Değer |`,
    `| --- | --- |`,
    `| Ürün adı | ${product.name} |`,
    `| Marka | ${product.brand ?? "—"} |`,
    `| Model | ${product.model ?? "—"} |`,
    `| MDR sınıfı | ${DEVICE_CLASS_LABEL[product.deviceClass as keyof typeof DEVICE_CLASS_LABEL] ?? product.deviceClass} |`,
    `| EMDN | ${product.emdnCode ?? "—"} |`,
    `| Temel UDI-DI | ${product.basicUdiDi ?? "—"} |`,
    `| UDI-DI | ${product.udiDi ?? "—"} |`,
    "",
    "### Kullanım amacı",
    product.intendedPurpose?.trim() || "—",
    "",
    "### Endikasyonlar",
    product.indications?.trim() || "—",
    "",
    "### Kontrendikasyonlar",
    product.contraindications?.trim() || "—",
    "",
    "### Malzemeler",
    product.materials?.trim() || "—",
    "",
    variantsMarkdown(product),
  ].join("\n");

  const logo = await loadCompanyLogo(ctx.companyId);
  return buildSectionDocx({
    titlePrimary: "Ürün Bilgileri",
    titleSecondary: "Product Information",
    annexRef: "MDR Annex II 1.1",
    contentMarkdown: md,
    companyName: product.company.name,
    productName: product.name,
    documentNo: "EK-1",
    revisionNo: "01",
    issueDate: packageDateFolder(now),
    revisionDate: packageDateFolder(now),
    revisionHistory: [],
    language: "tr",
    logo,
    generatedBy: ctx.user.name ?? ctx.user.email,
    generatedAt: now,
  });
}

async function buildPmsSectionDocx(
  product: { id: string; name: string; company: { name: string } },
  sectionKey: string,
  title: string,
  content: string,
  ctx: CompanyContext,
): Promise<Buffer | null> {
  if (!content?.trim()) return null;
  const now = new Date();
  const logo = await loadCompanyLogo(ctx.companyId);
  return buildSectionDocx({
    titlePrimary: title,
    titleSecondary: title,
    annexRef: sectionKey,
    contentMarkdown: content,
    companyName: product.company.name,
    productName: product.name,
    documentNo: sectionKey.toUpperCase(),
    revisionNo: "01",
    issueDate: packageDateFolder(now),
    revisionDate: packageDateFolder(now),
    revisionHistory: [],
    language: "tr",
    logo,
    generatedBy: ctx.user.name ?? ctx.user.email,
    generatedAt: now,
  });
}

export async function buildClinicalEvaluationPackage(
  ctx: CompanyContext,
  productId: string,
): Promise<{ entries: ZipEntry[]; zipName: string }> {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId: ctx.companyId, deletedAt: null },
    include: {
      company: { select: { name: true } },
      clinicalEvaluation: {
        include: {
          submittedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true, email: true } },
        },
      },
      riskManagementFile: true,
      technicalSections: {
        where: {
          key: { in: [...POST_MARKET_SECTION_KEYS] },
        },
      },
    },
  });

  if (!product?.clinicalEvaluation) {
    throw new Error("No clinical evaluation — generate draft first");
  }

  const exportProduct = await getClinicalEvaluationForExport(ctx.companyId, productId);
  if (!exportProduct?.clinicalEvaluation) {
    throw new Error("Not found");
  }

  const cer = exportProduct.clinicalEvaluation;
  const root = packageDateFolder();
  const entries: ZipEntry[] = [];
  const lit = parseLiteratureSearchJson(cer.literatureDataJson);
  const equiv = parseEquivalentDevicesJson(cer.equivalentDevicesDataJson);
  const qp = parseClinicalQpDocuments(cer.qpDocumentsJson);

  for (const lang of ["tr", "en"] as const) {
    try {
      const cep = await buildCepExportBuffer(exportProduct, ctx.companyId, lang, ctx);
      push(entries, root, cep.fileName, cep.buffer);
    } catch {
      /* CEP may be empty */
    }
    const cerBuf = await buildCerExportBuffer(exportProduct, cer, lang, ctx);
    push(entries, root, cerBuf.fileName, cerBuf.buffer);
  }

  const ek1 = `${root}/EK-1 Belgelenecek Urun Dokumanlari`;
  const profileDocx = await buildProductProfileDocx(product, ctx);
  push(entries, ek1, `Urun Bilgileri ${safeName(product.name)}.docx`, profileDocx);

  const ek2 = `${root}/EK-2 Klinisyen ve Yetkili Personel CV`;
  if (qp?.cvFileKey) {
    const cv = await readQpEvidenceBuffer(qp.cvFileKey);
    if (cv) push(entries, ek2, qp.cvFileName ?? "CV.pdf", cv);
  }
  if (qp?.cvSummary?.trim()) {
    push(entries, ek2, "CV-Ozet.txt", Buffer.from(qp.cvSummary, "utf8"));
  }

  const ek3 = `${root}/EK-3 Arama Ekranlari`;
  for (const ss of lit?.evidenceScreenshots ?? []) {
    const buf = await readLiteratureEvidenceBuffer(ss.storageKey);
    if (buf) push(entries, ek3, ss.fileName, buf);
  }
  for (const row of lit?.registryResults ?? []) {
    const sub = `${ek3}/${safeName(row.registryId)}`;
    for (const ss of row.evidenceScreenshots ?? []) {
      const buf = await readLiteratureEvidenceBuffer(ss.storageKey);
      if (buf) push(entries, sub, ss.fileName, buf);
    }
  }

  const ek4 = `${root}/EK-4 Kabul Edilen Makaleler`;
  for (const art of lit?.acceptedArticles ?? []) {
    const buf = await readAcceptedArticleBuffer(art.storageKey);
    if (buf) push(entries, ek4, art.fileName, buf);
  }

  const ek5 = `${root}/EK-5 Esdeger Cihaz Data`;
  for (const dev of equiv?.devices ?? []) {
    const folder = `${ek5}/${safeName(dev.deviceName || dev.manufacturer || "device")}`;
    if (dev.datasheetFile?.storageKey) {
      const buf = await readEquivalentEvidenceBuffer(dev.datasheetFile.storageKey);
      if (buf) push(entries, folder, dev.datasheetFile.fileName ?? "datasheet.pdf", buf);
    }
    for (const ss of dev.evidenceScreenshots ?? []) {
      const buf = await readEquivalentEvidenceBuffer(ss.storageKey);
      if (buf) push(entries, folder, ss.fileName, buf);
    }
  }

  const ek6 = `${root}/EK-6 Risk Analizi`;
  for (const kind of ["plan", "policy", "report", "annexA"] as const) {
    const doc = await buildRiskDocxBuffer(ctx, productId, kind, "tr");
    if (doc) push(entries, ek6, doc.fileName, doc.buffer);
  }

  const ek7 = `${root}/EK-7 SSGR`;
  const pmsTitles: Record<string, string> = {
    "pms-plan": "PMS Plani",
    "pmcf-plan": "PMCF Plani",
    "pmcf-report": "PMCF Raporu",
    "psur-report": "PSUR Raporu",
  };
  for (const sec of product.technicalSections) {
    const title = pmsTitles[sec.key] ?? sec.key;
    const buf = await buildPmsSectionDocx(
      product,
      sec.key,
      title,
      sec.content ?? "",
      ctx,
    );
    if (buf) push(entries, ek7, `${title}.docx`, buf);
  }

  const ek8 = `${root}/EK-8 Tarafsizlik Beyani`;
  if (qp?.coiFileKey) {
    const coi = await readQpEvidenceBuffer(qp.coiFileKey);
    if (coi) push(entries, ek8, qp.coiFileName ?? "Tarafsizlik-Beyani.pdf", coi);
  }
  if (qp?.coiStatement?.trim()) {
    push(entries, ek8, "Tarafsizlik-Beyani.txt", Buffer.from(qp.coiStatement, "utf8"));
  }

  const zipName = `Klinik-Degerlendirme-Paketi ${safeName(product.name)} ${root}.zip`;
  return { entries, zipName };
}
