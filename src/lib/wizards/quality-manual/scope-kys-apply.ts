import "server-only";
import { prisma } from "@/lib/db";
import { generateQmsDocument } from "@/lib/qms/generate-document";
import {
  buildWizardQmsContext,
  procedureScopeGuidance,
  resolveScopeAutoApplyCodes,
} from "@/lib/qms/scope-procedure-guidance";
import type { QmsDocGapRef } from "./gap-check";

export interface ScopeKysApplyResult {
  generated: { code: string; documentId: string }[];
  skipped: string[];
  failed: { code: string; error: string }[];
}

function hasContent(doc: QmsDocGapRef | undefined): boolean {
  return Boolean(doc?.content?.trim());
}

/** Generate scope-relevant KYS procedures from wizard answers (empty content only). */
export async function applyScopeGuidanceToKys(params: {
  companyId: string;
  userId: string;
  answers: Record<string, unknown>;
  qmsDocs: QmsDocGapRef[];
  locale: "tr" | "en";
  generatedBy: string;
}): Promise<ScopeKysApplyResult> {
  const byCode = new Map<string, QmsDocGapRef & { id?: string }>();
  for (const d of params.qmsDocs) {
    if (d.code?.trim()) byCode.set(d.code.trim(), d);
  }

  const emptyCodes = new Set(
    [...byCode.entries()].filter(([, d]) => !hasContent(d)).map(([c]) => c),
  );

  const codes = resolveScopeAutoApplyCodes(params.answers, emptyCodes);
  const baseContext = buildWizardQmsContext(params.answers, params.locale);

  const generated: { code: string; documentId: string }[] = [];
  const skipped: string[] = [];
  const failed: { code: string; error: string }[] = [];

  const fullDocs = await prisma.qMSDocument.findMany({
    where: { companyId: params.companyId, deletedAt: null },
    select: { id: true, code: true, content: true },
  });
  const idByCode = new Map(
    fullDocs.filter((d) => d.code).map((d) => [d.code!.trim(), d.id]),
  );

  for (const code of codes) {
    const docId = idByCode.get(code);
    if (!docId) {
      skipped.push(code);
      continue;
    }
    const doc = byCode.get(code);
    if (doc && hasContent(doc)) {
      skipped.push(code);
      continue;
    }

    const scopeNote = procedureScopeGuidance(code, params.answers, params.locale);
    const context = [
      baseContext,
      scopeNote ? `Procedure-specific requirements:\n${scopeNote}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const result = await generateQmsDocument(
        params.companyId,
        docId,
        params.locale,
        params.generatedBy,
        context,
      );
      if (result.content.trim()) {
        generated.push({ code, documentId: docId });
      } else {
        failed.push({ code, error: "empty_content" });
      }
    } catch (err) {
      failed.push({
        code,
        error: err instanceof Error ? err.message : "generate_failed",
      });
    }
  }

  return { generated, skipped, failed };
}
