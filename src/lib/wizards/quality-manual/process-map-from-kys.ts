/**
 * Client-safe: build process map wizard fields from KYS register + scope flags.
 * Generic for any company — driven by ISO 13485 procedure catalog and wizard answers.
 */

import { ISO13485_DOCS } from "@/lib/domain/constants";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import { isBooleanTrue } from "./steps";
import type { QmsDocSyncRef } from "./kys-answer-sync";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function fieldEmpty(answers: Record<string, unknown>, key: string): boolean {
  return !str(answers[key]);
}

function companyCodes(docs: QmsDocSyncRef[]): Set<string> {
  return new Set(docs.map((d) => d.code?.trim()).filter(Boolean) as string[]);
}

function titleForCode(code: string, locale: "tr" | "en"): string {
  const meta = ISO13485_DOCS.find((d) => d.code === code);
  return qmsDocTitle(code, meta?.title ?? code, locale);
}

function formatProcessBullet(code: string, locale: "tr" | "en"): string {
  const meta = ISO13485_DOCS.find((d) => d.code === code);
  const title = titleForCode(code, locale);
  const clause = meta?.clauseRefs ? ` — ${meta.clauseRefs}` : "";
  return `• ${title} (${code}${clause})`;
}

function pickOrderedCodes(wanted: string[], available: Set<string>): string[] {
  if (available.size === 0) return wanted;
  return wanted.filter((c) => available.has(c));
}

/** Core process SOP codes based on wizard scope (not company-specific). */
export function resolveCoreProcessCodes(answers: Record<string, unknown>): string[] {
  const distributionOnly = isBooleanTrue(answers.distributionOnly);
  const design = isBooleanTrue(answers.designAndDevelopmentIncluded);
  const sterile = isBooleanTrue(answers.sterileProductsIncluded);
  const installation = isBooleanTrue(answers.installationServicingIncluded);
  const software = isBooleanTrue(answers.softwareIncluded);

  const base = ["SOP-RM", "SOP-CH", "SOP-FB", "SOP-VG", "SOP-MDF", "SOP-NCP", "SOP-MON"];

  if (distributionOnly) {
    return [
      ...base,
      "SOP-PP",
      "SOP-TR",
      "SOP-ID",
      "SOP-PU",
      "SOP-SE",
    ];
  }

  const codes = [
    ...base,
    "SOP-PC",
    "SOP-TR",
    "SOP-ID",
    "SOP-PV",
    "SOP-PU",
    "SOP-SE",
  ];

  if (design || software) codes.push("SOP-DD", "SOP-CRP");
  if (sterile) codes.push("SOP-ST", "SOP-CLN");
  if (installation) codes.push("SOP-INST", "SOP-SRV");

  return [...new Set(codes)];
}

const SUPPORT_PROCESS_CODES = [
  "SOP-DC",
  "SOP-RC",
  "SOP-HR",
  "SOP-INF",
  "SOP-ENV",
  "SOP-ME",
  "SOP-PP",
];

const MANAGEMENT_PROCESS_CODES = [
  "SOP-ORG",
  "SOP-MR",
  "SOP-IA",
  "SOP-CAPA",
  "SOP-CC",
  "SOP-DA",
  "SOP-AN",
];

function buildInteractions(answers: Record<string, unknown>, locale: "tr" | "en"): string {
  const distributionOnly = isBooleanTrue(answers.distributionOnly);
  const design = isBooleanTrue(answers.designAndDevelopmentIncluded);

  if (locale === "tr") {
    const lines = [
      "• Müşteri / pazar gereklilikleri ve sipariş şartları → planlama ve ürün gerçekleştirme süreçlerine girdi (SOP-CRP, SOP-PC veya dağıtım süreçleri).",
    ];
    if (design) {
      lines.push(
        "• Tasarım ve geliştirme çıktıları → üretim planlama, validasyon ve teknik dosya / risk dosyası güncellemeleri (SOP-DD, SOP-RM, SOP-MDF).",
      );
    }
    if (!distributionOnly) {
      lines.push(
        "• Satın alma ve tedarikçi onayı → girdi kontrol → üretim ve serbest bırakma (SOP-PU, SOP-SE → SOP-PC → SOP-TR).",
      );
    } else {
      lines.push(
        "• Satın alma ve tedarikçi onayı → girdi kontrol → depolama ve sevkiyat (SOP-PU, SOP-SE → SOP-PP, SOP-TR).",
      );
    }
    lines.push(
      "• Üretim / hizmet ve kalite kontrol çıktıları → serbest bırakma ve izlenebilirlik kayıtları (SOP-PC, SOP-MON, SOP-NCP).",
      "• Şikâyet, PMS ve vigilans verileri → risk değerlendirmesi → CAPA ve değişiklik kontrolü (SOP-CH, SOP-FB, SOP-VG → SOP-RM → SOP-CAPA, SOP-CC).",
      "• Tüm süreç performans verileri (KPI, denetim, CAPA, şikâyet) → yönetimin gözden geçirmesi → hedef, kaynak ve iyileştirme kararları (SOP-MR).",
      "• Doküman ve kayıt kontrolü tüm süreçlerin dokümantasyon ve arşiv gerekliliklerini destekler (SOP-DC, SOP-RC).",
    );
    return lines.join("\n");
  }

  const lines = [
    "• Customer / market requirements and order specifications → planning and product realization inputs (SOP-CRP, SOP-PC or distribution processes).",
  ];
  if (design) {
    lines.push(
      "• Design and development outputs → production planning, validation and technical file / risk file updates (SOP-DD, SOP-RM, SOP-MDF).",
    );
  }
  if (!distributionOnly) {
    lines.push(
      "• Purchasing and supplier approval → incoming control → production and release (SOP-PU, SOP-SE → SOP-PC → SOP-TR).",
    );
  } else {
    lines.push(
      "• Purchasing and supplier approval → incoming control → storage and distribution (SOP-PU, SOP-SE → SOP-PP, SOP-TR).",
    );
  }
  lines.push(
    "• Production / service and QC outputs → release and traceability records (SOP-PC, SOP-MON, SOP-NCP).",
    "• Complaint, PMS and vigilance data → risk assessment → CAPA and change control (SOP-CH, SOP-FB, SOP-VG → SOP-RM → SOP-CAPA, SOP-CC).",
    "• Process performance data (KPIs, audits, CAPA, complaints) → management review → objectives, resources and improvement (SOP-MR).",
    "• Document and record control supports documentation and retention across all processes (SOP-DC, SOP-RC).",
  );
  return lines.join("\n");
}

function buildKpis(answers: Record<string, unknown>, locale: "tr" | "en"): string {
  const distributionOnly = isBooleanTrue(answers.distributionOnly);
  const design = isBooleanTrue(answers.designAndDevelopmentIncluded);

  if (locale === "tr") {
    const lines = [
      "• Şikâyet yönetimi: açık şikâyet kapanış süresi; şikâyet trendi ve tekrarlayan konular",
      "• CAPA: aksiyon kapanış süresi; tekrarlayan uygunsuzluk oranı",
      "• PMS / vigilans: planlanan raporlama periyodu uyumu; olay ve trend analizi",
      "• Tedarikçi: onaylı tedarikçi performans skoru; girdi red oranı",
      "• İç tetkik: bulgu kapanış süresi; majör/minör bulgu sayısı",
      "• Risk yönetimi: açık risk aksiyonlarının kapanış durumu",
    ];
    if (!distributionOnly) {
      lines.unshift(
        "• Üretim / ürün gerçekleştirme: planlanan vs gerçekleşen üretim; lot kabul/red oranı; uygunsuz ürün oranı",
        "• Serbest bırakma: bekleyen serbest bırakma süresi",
      );
    } else {
      lines.unshift("• Dağıtım / depolama: sevkiyat doğruluğu; stok uygunsuzluk oranı");
    }
    if (design) {
      lines.push("• Tasarım: açık tasarım değişiklikleri; doğrulama/geçerleme kapanış süresi");
    }
    return lines.join("\n");
  }

  const lines = [
    "• Complaint handling: open complaint closure time; complaint trends and repeats",
    "• CAPA: action closure time; recurring nonconformity rate",
    "• PMS / vigilance: planned reporting cycle compliance; event and trend analysis",
    "• Suppliers: approved supplier performance score; incoming rejection rate",
    "• Internal audit: finding closure time; major/minor finding counts",
    "• Risk management: open risk action closure status",
  ];
  if (!distributionOnly) {
    lines.unshift(
      "• Production / product realization: planned vs actual output; lot accept/reject rate; nonconforming product rate",
      "• Release: pending release turnaround time",
    );
  } else {
    lines.unshift("• Distribution / warehousing: shipping accuracy; stock nonconformity rate");
  }
  if (design) {
    lines.push("• Design: open design changes; verification/validation closure time");
  }
  return lines.join("\n");
}

/** Fill process map fields from KYS procedure register and scope flags. */
export function mergeProcessMapFromKys(
  answers: Record<string, unknown>,
  docs: QmsDocSyncRef[],
  locale: "tr" | "en",
  onlyFillEmpty = true,
): Record<string, unknown> {
  const available = companyCodes(docs);
  const merged = { ...answers };

  const coreCodes = pickOrderedCodes(resolveCoreProcessCodes(answers), available);
  const supportCodes = pickOrderedCodes(SUPPORT_PROCESS_CODES, available);
  const mgmtCodes = pickOrderedCodes(MANAGEMENT_PROCESS_CODES, available);

  if (
    coreCodes.length &&
    (onlyFillEmpty ? fieldEmpty(merged, "coreProcesses") : true)
  ) {
    merged.coreProcesses = coreCodes.map((c) => formatProcessBullet(c, locale)).join("\n");
  }

  if (
    supportCodes.length &&
    (onlyFillEmpty ? fieldEmpty(merged, "supportProcesses") : true)
  ) {
    merged.supportProcesses = supportCodes.map((c) => formatProcessBullet(c, locale)).join("\n");
  }

  if (
    mgmtCodes.length &&
    (onlyFillEmpty ? fieldEmpty(merged, "managementProcesses") : true)
  ) {
    merged.managementProcesses = mgmtCodes.map((c) => formatProcessBullet(c, locale)).join("\n");
  }

  if (onlyFillEmpty ? fieldEmpty(merged, "processInteractions") : true) {
    merged.processInteractions = buildInteractions(answers, locale);
  }

  if (onlyFillEmpty ? fieldEmpty(merged, "keyProcessKPIs") : true) {
    merged.keyProcessKPIs = buildKpis(answers, locale);
  }

  return merged;
}
