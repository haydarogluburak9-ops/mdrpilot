import "server-only";
import type { DocumentComposerType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createComposerDocument } from "@/lib/composer/service";
import { QM_FORM_STEPS, type StandardMode } from "./steps";
import { runQualityManualGapCheck, type GapCheckResult, type QmsDocGapRef } from "./gap-check";

type Answers = Record<string, unknown>;

function composerTypeFor(mode: StandardMode): DocumentComposerType {
  // BOTH generates the ISO 13485 manual (superset) but also folds in ISO 9001 references.
  return mode === "ISO_9001" ? "ISO9001_QUALITY_MANUAL" : "ISO13485_QUALITY_MANUAL";
}

/** Serializes wizard answers into a structured instruction block for the composer. */
function buildInstructions(mode: StandardMode, answers: Answers, gap: GapCheckResult): string {
  const lines: string[] = [];
  lines.push(`Generate a professional Quality Manual based on the structured intake below.`);
  lines.push(mode === "BOTH"
    ? "Cover ISO 13485:2016 as the primary framework and explicitly include ISO 9001:2015 cross-references where they differ."
    : `Primary framework: ${mode === "ISO_9001" ? "ISO 9001:2015" : "ISO 13485:2016"}.`);
  lines.push(
    "Produce a certified-style quality manual at the correct documentation level: scope, policy, organization, process map, ISO clause narratives and procedure references. " +
      "Do not copy or paste KYS procedure bodies into the manual — reference procedure codes only; full procedure text stays in the QMS register.",
  );
  lines.push("Where an answer is empty or unknown, write [TO BE CONFIRMED] rather than inventing content.");
  lines.push("");
  for (const step of QM_FORM_STEPS) {
    const entries = step.fields
      .map((f) => ({ f, v: answers[f.key] }))
      .filter((x) => x.v !== undefined && x.v !== null && String(x.v).trim() !== "");
    if (!entries.length) continue;
    lines.push(`## ${step.title}`);
    for (const { f, v } of entries) lines.push(`- ${f.label}: ${String(v).trim()}`);
    lines.push("");
  }
  if (gap.applicableClauses.length) {
    lines.push("## Applicable clauses (cite in Regulatory References)");
    for (const c of gap.applicableClauses) lines.push(`- ${c.standardCode} ${c.clauseNo} — ${c.title}`);
  }
  return lines.join("\n");
}

export interface GenerateQmParams {
  companyId: string;
  userId: string;
  standardMode: StandardMode;
  answers: Answers;
  gapResult?: GapCheckResult | null;
  qmsDocs?: QmsDocGapRef[];
  language?: "tr" | "en";
  ip?: string | null;
}

export interface GenerateQmResult {
  composerDocumentId: string;
  gap: GapCheckResult;
  type: DocumentComposerType;
}

/**
 * Generates a Quality Manual ComposerDocument from wizard answers.
 * Stores wizard answers in sourceSnapshotJson and merges gap-check findings
 * into the document's missingInformation / complianceGaps.
 */
export async function generateQualityManual(params: GenerateQmParams): Promise<GenerateQmResult> {
  const gap = params.gapResult ?? await runQualityManualGapCheck({
    companyId: params.companyId,
    standardMode: params.standardMode,
    answers: params.answers,
    qmsDocs: params.qmsDocs,
  });

  const type = composerTypeFor(params.standardMode);
  const titleSuffix = String(params.answers.tradeName || params.answers.companyLegalName || "").trim();
  const title = `${params.standardMode === "ISO_9001" ? "ISO 9001" : params.standardMode === "BOTH" ? "ISO 13485 + ISO 9001" : "ISO 13485"} Quality Manual${titleSuffix ? ` — ${titleSuffix}` : ""}`;

  const wizardKysDocs = (params.qmsDocs ?? []).map((d) => ({
    code: d.code,
    title: d.title ?? d.code ?? "—",
    content: d.content ?? null,
    status: d.status,
  }));

  const doc = await createComposerDocument({
    companyId: params.companyId,
    userId: params.userId,
    type,
    title,
    instructions: buildInstructions(params.standardMode, params.answers, gap),
    language: params.language ?? "tr",
    wizardAnswers: params.answers,
    wizardKysDocs,
    ip: params.ip,
  });

  // Fold wizard answers + gap-check into the document snapshot and analysis fields.
  const existingSnapshot = (doc.sourceSnapshotJson as Record<string, unknown> | null) ?? {};
  const existingMissing = (doc.missingInformationJson as string[] | null) ?? [];
  const existingGaps = (doc.complianceGapsJson as string[] | null) ?? [];

  const wizardMissing = [
    ...gap.missingCriticalFields.map((f) => `${f.label} (wizard step ${f.step})`),
  ];
  const mergedMissing = Array.from(new Set([...existingMissing, ...wizardMissing]));
  const mergedGaps = Array.from(
    new Set([
      ...existingGaps,
      ...gap.criticalGaps,
      ...gap.inconsistencies,
      ...gap.kysContentGaps.map((g) => `KYS ${g.code}: content needed`),
    ]),
  );

  await prisma.composerDocument.update({
    where: { id: doc.id },
    data: {
      sourceSnapshotJson: {
        ...existingSnapshot,
        qualityManualWizard: {
          standardMode: params.standardMode,
          answers: params.answers,
          gapCheck: gap,
        },
      } as object,
      missingInformationJson: mergedMissing as object,
      complianceGapsJson: mergedGaps as object,
    },
  });

  return { composerDocumentId: doc.id, gap, type };
}
