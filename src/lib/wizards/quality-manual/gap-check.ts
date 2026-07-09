import "server-only";
import { prisma } from "@/lib/db";
import { getMeteredAiProvider, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { retrieveClauses } from "@/lib/rag/retriever";
import { scaffoldCompanyQms } from "@/lib/qms/scaffold";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { binaryContentLang, isAppLocale, type Lang } from "@/lib/i18n/locales";
import { resolveDictionary } from "@/lib/i18n/resolve";
import { QM_CRITICAL_FIELDS, qmFieldLabel, isBooleanTrue, type StandardMode } from "./steps";
import { QM_PROCEDURE_FIELD_TO_QMS_CODE } from "./procedure-codes";
import { QM_ANSWER_FIELD_TO_QMS_CODE } from "./kys-answer-sync";
import {
  type GapActionItem,
  type KysContentGap,
  formatGapActionItem,
} from "./gap-messages";
import { resolveScopeAutoApplyCodes } from "@/lib/qms/scope-procedure-guidance";

export interface GapClause {
  standardCode: string;
  clauseNo: string;
  title: string;
}

export interface RequiredProcedure {
  label: string;
  fieldKey: string;
  code: string | null;
  present: boolean;
  critical: boolean;
  inRegister: boolean;
  contentReady: boolean;
  status: string | null;
}

export interface GapCheckResult {
  missingCriticalFields: { key: string; label: string; step: number }[];
  /** Deterministic critical items only (no AI). Formatted EN strings for composer export. */
  criticalGaps: string[];
  actionItems: GapActionItem[];
  kysContentGaps: KysContentGap[];
  inconsistencies: string[];
  warnings: string[];
  /** AI auditor simulation — does not affect readyToGenerate. */
  auditorNotes: string[];
  auditorInconsistencies: string[];
  applicableClauses: GapClause[];
  requiredProcedures: RequiredProcedure[];
  /** KYS codes that scope auto-apply can generate when empty. */
  scopeAutoApplyCodes: string[];
  readyToGenerate: boolean;
  summary: string;
  generatedAt: string;
}

export interface QmsDocGapRef {
  code: string | null;
  title: string | null;
  status: string;
  content: string | null;
}

type Answers = Record<string, unknown>;

function val(answers: Answers, key: string): string {
  const v = answers[key];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function isFieldEmpty(answers: Answers, key: string): boolean {
  return !val(answers, key);
}

function boolUnset(answers: Answers, key: string): boolean {
  const v = answers[key];
  return v === null || v === undefined || v === "";
}

function docMap(docs: QmsDocGapRef[]): Map<string, QmsDocGapRef> {
  const map = new Map<string, QmsDocGapRef>();
  for (const d of docs) {
    const code = d.code?.trim();
    if (code) map.set(code, d);
  }
  return map;
}

function hasContent(doc: QmsDocGapRef | undefined): boolean {
  return Boolean(doc?.content?.trim());
}

function pushKysGap(
  gaps: KysContentGap[],
  seen: Set<string>,
  params: KysContentGap,
): void {
  const id = `${params.code}:${params.fieldKey ?? ""}`;
  if (seen.has(id)) return;
  seen.add(id);
  gaps.push(params);
}

const PROCEDURE_CHECKS: { fieldKey: string; label: string; critical: boolean }[] = [
  { fieldKey: "documentControlProcedureCode", label: "Document control procedure", critical: true },
  { fieldKey: "recordControlProcedureCode", label: "Record control procedure", critical: true },
  { fieldKey: "capaProcedureCode", label: "CAPA procedure", critical: true },
  { fieldKey: "complaintProcedureCode", label: "Complaint handling procedure", critical: true },
  { fieldKey: "internalAuditProcedureCode", label: "Internal audit procedure", critical: true },
  { fieldKey: "managementReviewProcedureCode", label: "Management review procedure", critical: true },
  { fieldKey: "organizationProcedureCode", label: "Organization & roles procedure", critical: true },
  { fieldKey: "riskManagementProcedureCode", label: "Risk management procedure", critical: false },
  { fieldKey: "supplierProcedureCode", label: "Supplier evaluation procedure", critical: false },
  { fieldKey: "productionProcedureCode", label: "Production control procedure", critical: false },
  { fieldKey: "sterilizationProcedureCode", label: "Sterilization control procedure", critical: false },
  { fieldKey: "trainingProcedureCode", label: "Training procedure", critical: false },
  { fieldKey: "vigilanceProcedureCode", label: "Vigilance procedure", critical: false },
  { fieldKey: "changeControlProcedureCode", label: "Change control procedure", critical: false },
];

const METHOD_FIELDS: { fieldKey: string; step: number }[] = [
  { fieldKey: "complaintHandlingMethod", step: 8 },
  { fieldKey: "pmsMethod", step: 8 },
  { fieldKey: "capaMethod", step: 8 },
];

const EN_DICT = dictionaries.en;

function formatItems(items: GapActionItem[]): string[] {
  return items.map((item) => formatGapActionItem(item, EN_DICT));
}

/**
 * Deterministic gap check (+ RAG clauses, optional AI auditor notes).
 * Critical gaps = verifiable wizard / KYS register facts only — AI does not inflate the count.
 */
export async function runQualityManualGapCheck(params: {
  companyId: string;
  standardMode: StandardMode;
  answers: Answers;
  qmsDocs?: QmsDocGapRef[];
  locale?: Lang;
}): Promise<GapCheckResult> {
  const { companyId, standardMode, answers } = params;
  const locale: Lang = params.locale && isAppLocale(params.locale) ? params.locale : "tr";
  const contentLocale = binaryContentLang(locale);
  const localeDict = resolveDictionary(locale);
  const qmsDocs = params.qmsDocs ?? [];
  const byCode = docMap(qmsDocs);
  const kysSeen = new Set<string>();

  const actionItems: GapActionItem[] = [];
  const kysContentGaps: KysContentGap[] = [];

  const pushAction = (item: GapActionItem) => {
    const dup = actionItems.some(
      (a) =>
        a.messageKey === item.messageKey &&
        a.fieldKey === item.fieldKey &&
        a.kysCode === item.kysCode,
    );
    if (!dup) actionItems.push(item);
  };

  const auditKysCode = (
    code: string,
    fieldKey?: string,
    titleFallback?: string,
  ): void => {
    const doc = byCode.get(code);
    const title = doc?.title?.trim() || titleFallback || code;

    if (!doc) {
      pushKysGap(kysContentGaps, kysSeen, {
        code,
        title,
        fieldKey,
        status: null,
        reason: "not_in_register",
      });
      return;
    }

    if (doc.status === "MISSING" || !hasContent(doc)) {
      pushKysGap(kysContentGaps, kysSeen, {
        code,
        title: doc.title?.trim() || title,
        fieldKey,
        status: doc.status,
        reason: doc.status === "MISSING" ? "status_missing" : "empty_content",
      });
    }
  };

  // 1. Critical wizard fields (text / unset booleans).
  const missingCriticalFields = QM_CRITICAL_FIELDS.filter((f) => {
    const field = QM_FORM_STEPS_FLAT.find((x) => x.key === f.key);
    if (field?.type === "boolean") return boolUnset(answers, f.key);
    return isFieldEmpty(answers, f.key);
  });

  for (const f of missingCriticalFields) {
    pushAction({
      kind: "wizard_field",
      severity: "critical",
      step: f.step,
      fieldKey: f.key,
      messageKey: "critical_field_empty",
      params: { label: f.label, step: String(f.step) },
    });
  }

  // 2. Procedure references + KYS content readiness.
  const requiredProcedures: RequiredProcedure[] = PROCEDURE_CHECKS.map((c) => {
    const code = val(answers, c.fieldKey) || null;
    const mappedCode = QM_PROCEDURE_FIELD_TO_QMS_CODE[c.fieldKey];
    const resolvedCode = code || mappedCode || null;
    const doc = resolvedCode ? byCode.get(resolvedCode) : undefined;
    const inRegister = Boolean(doc);
    const contentReady = hasContent(doc);
    const present = Boolean(code);

    return {
      label: c.label,
      fieldKey: c.fieldKey,
      code: resolvedCode,
      present,
      critical: c.critical,
      inRegister,
      contentReady,
      status: doc?.status ?? null,
    };
  });

  for (const p of requiredProcedures) {
    if (!p.present && p.critical) {
      pushAction({
        kind: "procedure_ref",
        severity: "critical",
        step: 5,
        fieldKey: p.fieldKey,
        kysCode: p.code ?? QM_PROCEDURE_FIELD_TO_QMS_CODE[p.fieldKey],
        messageKey: "missing_mandatory_procedure",
        params: { label: p.label },
      });
    } else if (!p.present && !p.critical) {
      pushAction({
        kind: "procedure_ref",
        severity: "warning",
        step: 5,
        fieldKey: p.fieldKey,
        messageKey: "recommended_procedure_missing",
        params: { label: p.label },
      });
    }

    if (p.code && p.inRegister && !p.contentReady) {
      auditKysCode(p.code, p.fieldKey, p.label);
    } else if (p.code && !p.inRegister) {
      auditKysCode(p.code, p.fieldKey, p.label);
    }
  }

  // 3. Scope-conditional rules.
  const designIncluded = isBooleanTrue(answers.designAndDevelopmentIncluded);
  const sterileIncluded = isBooleanTrue(answers.sterileProductsIncluded);
  const distributionOnly = isBooleanTrue(answers.distributionOnly);
  const sterilizationMethod = val(answers, "sterilizationMethod").toLowerCase();

  if (!distributionOnly && !val(answers, "productionProcedureCode")) {
    pushAction({
      kind: "procedure_ref",
      severity: "critical",
      step: 5,
      fieldKey: "productionProcedureCode",
      kysCode: "SOP-PC",
      messageKey: "production_required",
    });
    auditKysCode("SOP-PC", "productionProcedureCode");
  }

  if (sterileIncluded || (sterilizationMethod && sterilizationMethod !== "none" && sterilizationMethod !== "non-sterile")) {
    if (!val(answers, "sterilizationProcedureCode")) {
      pushAction({
        kind: "procedure_ref",
        severity: "critical",
        step: 5,
        fieldKey: "sterilizationProcedureCode",
        kysCode: "SOP-ST",
        messageKey: "sterile_no_sterilization_proc",
      });
    }
    auditKysCode("SOP-ST", "sterilizationProcedureCode");
    if (hasContent(byCode.get("SOP-ST"))) auditKysCode("SOP-CLN", "sterilizationMethod");
  }

  if (designIncluded) {
    auditKysCode("SOP-DD", "designAndDevelopmentIncluded");
    auditKysCode("SOP-CRP", "designAndDevelopmentIncluded");
    const ddDoc = byCode.get("SOP-DD");
    if (!ddDoc || !hasContent(ddDoc)) {
      pushAction({
        kind: "scope_warning",
        severity: "warning",
        step: 2,
        kysCode: "SOP-DD",
        messageKey: "design_scope_document",
      });
    }
  }

  // 4. Method fields (step 8) — link to KYS content.
  for (const { fieldKey, step } of METHOD_FIELDS) {
    if (!isFieldEmpty(answers, fieldKey)) continue;

    const sopCode = QM_ANSWER_FIELD_TO_QMS_CODE[fieldKey];
    const doc = sopCode ? byCode.get(sopCode) : undefined;
    const fieldLabel = qmFieldLabel(fieldKey);

    if (!sopCode || !doc) {
      pushAction({
        kind: "wizard_field",
        severity: "critical",
        step,
        fieldKey,
        kysCode: sopCode,
        messageKey: "method_field_empty",
        params: { label: fieldLabel, step: String(step) },
      });
      if (sopCode) auditKysCode(sopCode, fieldKey, fieldLabel);
      continue;
    }

    if (!hasContent(doc)) {
      pushAction({
        kind: "kys_content",
        severity: "critical",
        step,
        fieldKey,
        kysCode: sopCode,
        messageKey: "method_needs_kys_content",
        params: { label: fieldLabel, code: sopCode, step: String(step) },
      });
      auditKysCode(sopCode, fieldKey, fieldLabel);
    } else {
      pushAction({
        kind: "wizard_field",
        severity: "critical",
        step,
        fieldKey,
        messageKey: "method_field_empty_sync",
        params: { label: fieldLabel, code: sopCode, step: String(step) },
      });
    }
  }

  // 5. Other KYS-linked wizard fields (steps 6–7) when empty and source doc empty.
  for (const [fieldKey, sopCode] of Object.entries(QM_ANSWER_FIELD_TO_QMS_CODE)) {
    if (METHOD_FIELDS.some((m) => m.fieldKey === fieldKey)) continue;
    if (!isFieldEmpty(answers, fieldKey)) continue;
    const doc = byCode.get(sopCode);
    if (!doc || !hasContent(doc)) {
      auditKysCode(sopCode, fieldKey);
    }
  }

  // 6. Data inconsistencies (deterministic).
  if (distributionOnly && designIncluded) {
    pushAction({
      kind: "inconsistency",
      severity: "critical",
      step: 2,
      messageKey: "distribution_design_conflict",
    });
  }

  if (!sterileIncluded && sterilizationMethod && sterilizationMethod !== "none" && sterilizationMethod !== "non-sterile") {
    pushAction({
      kind: "inconsistency",
      severity: "critical",
      step: 7,
      fieldKey: "sterilizationMethod",
      messageKey: "sterile_method_mismatch",
      params: { method: val(answers, "sterilizationMethod") },
    });
  }

  const stds = val(answers, "applicableStandards").toLowerCase();
  if (standardMode === "ISO_9001" && stds.includes("13485")) {
    pushAction({
      kind: "inconsistency",
      severity: "warning",
      messageKey: "standard_mode_mismatch",
    });
  }

  if (designIncluded && hasContent(byCode.get("SOP-DD"))) {
    pushAction({
      kind: "scope_warning",
      severity: "warning",
      messageKey: "design_dhf_reminder",
    });
  }

  // 7. RAG applicable clauses.
  const standardFocus =
    standardMode === "ISO_9001" ? "ISO 9001" : standardMode === "ISO_13485" ? "ISO 13485" : "ISO 9001 ISO 13485";
  const ragQuery = [
    standardFocus,
    "quality manual quality management system",
    val(answers, "scopeStatement"),
    val(answers, "qmsScope"),
    val(answers, "coreProcesses"),
    designIncluded ? "design and development" : "",
    sterileIncluded ? "sterilization sterile" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const clauses = await retrieveClauses(companyId, ragQuery, 8);
  const applicableClauses: GapClause[] = clauses
    .filter((c) => (standardMode === "BOTH" ? true : c.standardCode.includes(standardFocus) || c.standardCode.startsWith("ISO")))
    .map((c) => ({ standardCode: c.standardCode, clauseNo: c.clauseNo, title: c.title }));

  // 8. AI auditor notes (separate — never merged into criticalGaps).
  const auditorNotes: string[] = [];
  const auditorInconsistencies: string[] = [];
  const deterministicCritical = formatItems(actionItems.filter((a) => a.severity === "critical"));
  const deterministicInconsistencies = actionItems
    .filter((a) => a.kind === "inconsistency")
    .map((a) => formatGapActionItem(a, localeDict));

  const aiLangInstruction =
    contentLocale === "tr"
      ? "Write every note in Turkish (Türkçe)."
      : "Write every note in English.";

  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  try {
    provider = await getMeteredAiProvider({ companyId: params.companyId, feature: "qm-gap-check" });
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
  }
  if (provider) {
    try {
      const raw = await provider.complete(
        [
          {
            role: "system",
            content:
              "You are an ISO 9001/13485 lead auditor. The system already flagged concrete wizard/KYS gaps. " +
              "Do NOT repeat items already listed. Add up to 5 subtle regulatory alignment notes only. " +
              aiLangInstruction +
              " Respond ONLY with JSON {\"notes\":string[],\"inconsistencies\":string[]}. Do not give regulatory approval.",
          },
          {
            role: "user",
            content: `Standard mode: ${standardMode}\nAlready flagged critical:\n${deterministicCritical.join("\n")}\n` +
              `KYS content gaps: ${kysContentGaps.map((g) => g.code).join(", ")}\n` +
              `Inconsistencies:\n${deterministicInconsistencies.join("\n")}\n` +
              `Wizard answers:\n${JSON.stringify(answers).slice(0, 4000)}`,
          },
        ],
        { json: true },
      );
      const ai = extractJson(raw) as { notes?: string[]; inconsistencies?: string[] } | null;
      if (ai) {
        for (const n of ai.notes ?? []) {
          if (typeof n === "string" && n.trim()) auditorNotes.push(n.trim());
        }
        for (const i of ai.inconsistencies ?? []) {
          if (typeof i === "string" && i.trim()) auditorInconsistencies.push(i.trim());
        }
      }
    } catch (err) {
      console.error("[qm-gap-check] AI auditor notes failed", err);
    }
  }

  const criticalGaps = deterministicCritical;
  const criticalCount = actionItems.filter((a) => a.severity === "critical").length;
  const readyToGenerate = criticalCount === 0;

  const inconsistencies = actionItems
    .filter((a) => a.kind === "inconsistency" && a.severity !== "critical")
    .map((a) => formatGapActionItem(a, localeDict));

  const warnings = actionItems
    .filter((a) => a.severity === "warning" && a.kind !== "inconsistency")
    .map((a) => formatGapActionItem(a, localeDict));

  const warningCount = actionItems.filter((a) => a.severity === "warning").length;

  const emptyCodes = new Set(
    [...byCode.entries()].filter(([, d]) => !hasContent(d)).map(([c]) => c),
  );
  const scopeAutoApplyCodes = resolveScopeAutoApplyCodes(answers, emptyCodes);

  const summary =
    contentLocale === "tr"
      ? readyToGenerate
        ? `Wizard/KYS'de kritik eksik yok. ${kysContentGaps.length} prosedür içeriği yazılmalı. ${warningCount} kapsam notu.`
        : `${criticalCount} yapılacak kritik madde — wizard alanları veya KYS prosedür içerikleri.`
      : readyToGenerate
        ? `No critical wizard/KYS gaps. ${kysContentGaps.length} procedure(s) need content. ${warningCount} scope note(s).`
        : `${criticalCount} actionable critical item(s). Fix wizard fields or KYS procedure content.`;

  return {
    missingCriticalFields,
    criticalGaps,
    actionItems,
    kysContentGaps,
    inconsistencies,
    warnings,
    auditorNotes,
    auditorInconsistencies,
    applicableClauses,
    requiredProcedures,
    scopeAutoApplyCodes,
    readyToGenerate,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

/** Minimal field metadata for boolean checks in gap-check (mirrors steps.ts). */
const QM_FORM_STEPS_FLAT = [
  { key: "designAndDevelopmentIncluded", type: "boolean" as const },
  { key: "sterileProductsIncluded", type: "boolean" as const },
];

/** Pulls company QMS documents to display alongside the procedures step. */
export async function listCompanyQmsDocs(companyId: string) {
  await scaffoldCompanyQms(companyId, ["ISO 13485"]);

  const docs = await prisma.qMSDocument.findMany({
    where: { companyId, deletedAt: null },
    select: { code: true, title: true, standard: true, status: true, content: true },
    orderBy: { code: "asc" },
  });
  return docs;
}

export { qmFieldLabel };
