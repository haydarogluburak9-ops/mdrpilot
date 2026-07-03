import "server-only";
import { prisma } from "@/lib/db";
import { formatStandardReference } from "@/lib/domain/standards-catalog";
import { isGsprAutoHint } from "@/lib/domain/gspr-evidence-i18n";

export interface GsprRowContext {
  gsprNo: string;
  applicable: string;
  requirementSummary: string;
  standardReference: string | null;
  evidenceDocument: string | null;
  linkedFiles: string[];
}

export interface GsprDossierContext {
  productDesc: string;
  riskBlock: string;
  filesBlock: string;
  rowContexts: Map<string, GsprRowContext>;
}

function clip(text: string | null | undefined, max: number): string {
  if (!text?.trim()) return "";
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** Load product dossier snippets for substantive GSPR justifications. */
export async function buildGsprDossierContext(
  productId: string,
  companyId: string,
  productDesc: string,
  gsprItems: {
    id: string;
    gsprNo: string;
    applicable: string;
    requirementSummary: string;
    standardReference: string | null;
    evidenceDocument: string | null;
  }[],
): Promise<GsprDossierContext> {
  const [riskItems, files, evidenceLinks] = await Promise.all([
    prisma.riskItem.findMany({
      where: { productId },
      select: {
        hazard: true,
        harm: true,
        initialRiskLevel: true,
        residualRiskLevel: true,
        riskControlMeasure: true,
        benefitRiskJustification: true,
      },
      take: 12,
    }),
    prisma.uploadedFile.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [{ productId }, { productId: null }],
      },
      select: {
        fileName: true,
        documentKind: true,
        analysisSummary: true,
        textExtract: true,
        aiSummary: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.gSPREvidenceLink.findMany({
      where: { productId, companyId },
      include: {
        uploadedFile: { select: { fileName: true, analysisSummary: true, textExtract: true } },
        gsprItem: { select: { gsprNo: true } },
      },
    }),
  ]);

  const riskLines = riskItems.map((r) => {
    const parts = [
      `Tehlike: ${r.hazard}`,
      r.harm ? `Zarar: ${r.harm}` : null,
      `Başlangıç/artık risk: ${r.initialRiskLevel}→${r.residualRiskLevel}`,
      r.riskControlMeasure ? `Kontrol: ${clip(r.riskControlMeasure, 120)}` : null,
      r.benefitRiskJustification ? `Fayda-risk: ${clip(r.benefitRiskJustification, 160)}` : null,
    ].filter(Boolean);
    return `- ${parts.join("; ")}`;
  });

  const riskBlock = riskLines.length
    ? ["Risk dosyası özeti:", ...riskLines].join("\n")
    : "Risk dosyası: henüz kayıtlı risk maddesi yok.";

  const fileLines = files.map((f) => {
    const summary = clip(f.analysisSummary ?? f.aiSummary, 200);
    const extract = clip(f.textExtract, 300);
    return `- ${f.fileName} [${f.documentKind}]${summary ? `: ${summary}` : ""}${extract ? ` | Özet metin: ${extract}` : ""}`;
  });

  const filesBlock = fileLines.length
    ? ["Dosya Merkezi / analiz özetleri:", ...fileLines].join("\n")
    : "Dosya Merkezi: analiz edilmiş dosya yok.";

  const linksByGspr = new Map<string, string[]>();
  for (const link of evidenceLinks) {
    const no = link.gsprItem.gsprNo;
    const list = linksByGspr.get(no) ?? [];
    const snippet = clip(link.uploadedFile.analysisSummary ?? link.uploadedFile.textExtract, 150);
    list.push(snippet ? `${link.uploadedFile.fileName} — ${snippet}` : link.uploadedFile.fileName);
    linksByGspr.set(no, list);
  }

  const rowContexts = new Map<string, GsprRowContext>();
  for (const g of gsprItems) {
    const linked = linksByGspr.get(g.gsprNo) ?? [];
    const evidence =
      g.evidenceDocument && !isGsprAutoHint(g.evidenceDocument) ? g.evidenceDocument : null;
    rowContexts.set(g.gsprNo, {
      gsprNo: g.gsprNo,
      applicable: g.applicable,
      requirementSummary: g.requirementSummary,
      standardReference: g.standardReference
        ? (formatStandardReference(g.standardReference) ?? g.standardReference)
        : null,
      evidenceDocument: evidence,
      linkedFiles: linked,
    });
  }

  return { productDesc, riskBlock, filesBlock, rowContexts };
}
