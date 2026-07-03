import "server-only";

import {
  buildAsciiChart,
  buildRolesMatrixMarkdown,
  collectOrganizationRoleInputs,
} from "./organization-ai-generate";
import { ORGANIZATION_WIZARD_ROLE_KEYS } from "./organization-from-word";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function combineSections(
  parts: { structure: string; chart: string; matrix: string },
  locale: "tr" | "en",
): string {
  const hStructure = locale === "tr" ? "## 1. Organizasyon Yapısı" : "## 1. Organization Structure";
  const hChart = locale === "tr" ? "## 2. Organizasyon Şeması" : "## 2. Organization Chart";
  const hRoles = locale === "tr" ? "## 3. Roller ve Sorumluluklar" : "## 3. Roles and Responsibilities";
  const blocks: string[] = [];
  if (parts.structure.trim()) blocks.push(hStructure, "", parts.structure.trim());
  if (parts.chart.trim()) blocks.push("", hChart, "", parts.chart.trim());
  if (parts.matrix.trim()) blocks.push("", hRoles, "", parts.matrix.trim());
  return blocks.join("\n").trim();
}

/** Build full markdown for Word export (structure + chart + roles matrix). */
export function buildOrganizationExportMarkdown(
  answers: Record<string, unknown>,
  locale: "tr" | "en",
): string {
  const structure = str(answers.organizationStructureText);
  const chart = str(answers.organizationChartText);
  const matrix = str(answers.organizationRolesMatrixText);

  if (
    structure.includes("## Organizasyon") ||
    structure.includes("## Organization") ||
    structure.includes("Organizasyon Şeması") ||
    structure.includes("Organization Chart")
  ) {
    return structure.replace(/```/g, "").trim();
  }

  const roles = collectOrganizationRoleInputs(answers, locale);
  const parts = { structure, chart, matrix };

  if (!parts.structure && roles.length) {
    const companyName =
      str(answers.companyLegalName) ||
      str(answers.tradeName) ||
      (locale === "tr" ? "Üretici" : "Manufacturer");
    const scope = str(answers.scopeStatement) || str(answers.qmsScope);
    parts.structure =
      locale === "tr"
        ? [
            `${companyName} bünyesinde kalite yönetim sistemi organizasyonu, tıbbi cihaz güvenliği, hasta güvenliği ve MDR/ISO 13485 düzenleyici uygunluk gerekliliklerini karşılamak üzere yapılandırılmıştır.`,
            scope ? `KYS kapsamı: ${scope}` : "",
            "Organizasyon yapısı; üst yönetim, yönetim temsilcisi, kalite yönetimi ve fonksiyonel sorumlular arasında tanımlı yetki, sorumluluk ve raporlama ilişkileri ile işler.",
            "Bu doküman ISO 13485 madde 5.5 (sorumluluk, yetki ve iletişim) ve kalite el kitabı organizasyon bölümü ile uyumludur.",
          ]
            .filter(Boolean)
            .join("\n\n")
        : [
            `The QMS organization of ${companyName} is structured for medical device safety, patient safety and MDR/ISO 13485 conformity.`,
            scope ? `QMS scope: ${scope}` : "",
            "Authority, responsibility and reporting are defined between top management, the management representative, quality management and functional owners.",
            "This documentation aligns with ISO 13485 clause 5.5 and the quality manual organization section.",
          ]
            .filter(Boolean)
            .join("\n\n");
  }

  if (roles.length) {
    parts.matrix = buildRolesMatrixMarkdown(roles, locale);
    if (!parts.chart.trim()) {
      parts.chart = buildAsciiChart(roles, locale);
    }
  }

  const body = combineSections(parts, locale);
  if (!body) return "";

  const title =
    locale === "tr"
      ? "# Organizasyon Yapısı, Şema ve Roller"
      : "# Organization Structure, Chart and Roles";
  const intro =
    locale === "tr"
      ? "Bu doküman, kalite yönetim sistemi organizasyonunu, raporlama ilişkilerini ve görev/sorumluluk tanımlarını bir arada sunar."
      : "This document presents the QMS organization, reporting lines and role responsibilities.";

  return `${title}\n\n${intro}\n\n${body}`;
}

export function organizationExportHasContent(answers: Record<string, unknown>): boolean {
  return Boolean(
    str(answers.organizationStructureText) ||
      str(answers.organizationChartText) ||
      str(answers.organizationRolesMatrixText) ||
      ORGANIZATION_WIZARD_ROLE_KEYS.some((k) => str(answers[k])),
  );
}
