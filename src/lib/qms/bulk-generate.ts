import "server-only";
import { prisma } from "@/lib/db";
import { QMS_REGISTER_EXCLUDED_CODES } from "@/lib/domain/constants";
import { generateQmsDocument } from "@/lib/qms/generate-document";
import { KYS_LAYER_DEFINITIONS, type QmsDocumentLayer } from "@/lib/qms/kys-structure";
import { scaffoldCompanyQms } from "@/lib/qms/scaffold";
import { loadQmsWizardAnswers } from "@/lib/qms/wizard-context";

export interface BulkQmsGenerateResult {
  total: number;
  ok: number;
  failed: number;
  skipped: number;
  items: { code: string; documentId: string; status: "ok" | "failed" | "skipped"; error?: string }[];
}

const LAYER_ORDER: QmsDocumentLayer[] = KYS_LAYER_DEFINITIONS.map((d) => d.layer);

function layerRank(layer: string): number {
  const idx = LAYER_ORDER.indexOf(layer as QmsDocumentLayer);
  return idx >= 0 ? idx : 99;
}

/** Generate AI drafts for all empty KYS documents (procedures first, then children). */
export async function bulkGenerateQmsDocuments(params: {
  companyId: string;
  locale: "tr" | "en";
  generatedBy: string;
  standard?: string;
  onlyEmpty?: boolean;
  maxDocs?: number;
}): Promise<BulkQmsGenerateResult> {
  await scaffoldCompanyQms(params.companyId, ["ISO 13485"]);

  const answers = await loadQmsWizardAnswers(params.companyId);
  const excluded = new Set<string>(QMS_REGISTER_EXCLUDED_CODES);

  const docs = await prisma.qMSDocument.findMany({
    where: {
      companyId: params.companyId,
      deletedAt: null,
      ...(params.standard ? { standard: params.standard } : {}),
      NOT: { code: { in: [...excluded] } },
    },
    select: { id: true, code: true, content: true, layer: true },
    orderBy: { code: "asc" },
  });

  const pending = docs
    .filter((d) => {
      if (!d.code?.trim()) return false;
      if (params.onlyEmpty !== false && (d.content?.trim() ?? "").length > 80) return false;
      return true;
    })
    .sort((a, b) => {
      const lr = layerRank(a.layer) - layerRank(b.layer);
      if (lr !== 0) return lr;
      return (a.code ?? "").localeCompare(b.code ?? "");
    });

  const limit = params.maxDocs ?? pending.length;
  const batch = pending.slice(0, limit);

  const items: BulkQmsGenerateResult["items"] = [];
  let ok = 0;
  let failed = 0;
  let skipped = docs.length - pending.length;

  for (const doc of batch) {
    const code = doc.code!.trim();
    try {
      const result = await generateQmsDocument(
        params.companyId,
        doc.id,
        params.locale,
        params.generatedBy,
        undefined,
        answers,
      );
      if (result.content.trim()) {
        ok++;
        items.push({ code, documentId: doc.id, status: "ok" });
      } else {
        failed++;
        items.push({ code, documentId: doc.id, status: "failed", error: "empty_content" });
      }
    } catch (err) {
      failed++;
      items.push({
        code,
        documentId: doc.id,
        status: "failed",
        error: err instanceof Error ? err.message : "generate_failed",
      });
    }
  }

  return { total: batch.length, ok, failed, skipped, items };
}
