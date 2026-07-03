import "server-only";
import { prisma } from "@/lib/db";

/** Wizard answer keys filled from the roles & responsibilities Word document. */
export const ORGANIZATION_WIZARD_ROLE_KEYS = [
  "generalManager",
  "managementRepresentative",
  "qualityManager",
  "regulatoryResponsible",
  "productionResponsible",
  "purchasingResponsible",
  "complaintHandlingResponsible",
  "internalAuditResponsible",
  "managementReviewOwner",
] as const;

export type OrganizationWizardRoleKey = (typeof ORGANIZATION_WIZARD_ROLE_KEYS)[number];

const ROLE_PATTERNS: { key: OrganizationWizardRoleKey; patterns: RegExp[] }[] = [
  {
    key: "generalManager",
    patterns: [/genel\s*müdür/i, /general\s*manager/i, /\bCEO\b/i, /üst\s*yönetim/i],
  },
  {
    key: "managementRepresentative",
    patterns: [/yönetim\s*temsilcisi/i, /management\s*representative/i, /\bYT\b/],
  },
  {
    key: "qualityManager",
    patterns: [/kalite\s*müdür/i, /quality\s*manager/i, /kalite\s*yönetim/i],
  },
  {
    key: "regulatoryResponsible",
    patterns: [
      /düzenleyici\s*sorumlu/i,
      /regulatory\s*affairs/i,
      /\bPRRC\b/i,
      /\bKBK\b/i,
      /uygunluk\s*sorumlu/i,
    ],
  },
  {
    key: "productionResponsible",
    patterns: [/üretim\s*sorumlu/i, /production\s*responsible/i, /üretim\s*müdür/i],
  },
  {
    key: "purchasingResponsible",
    patterns: [/satın\s*alma\s*sorumlu/i, /purchasing\s*responsible/i],
  },
  {
    key: "complaintHandlingResponsible",
    patterns: [/şikayet\s*sorumlu/i, /complaint\s*handling/i, /müşteri\s*şikayet/i],
  },
  {
    key: "internalAuditResponsible",
    patterns: [/iç\s*denetim\s*sorumlu/i, /internal\s*audit\s*responsible/i],
  },
  {
    key: "managementReviewOwner",
    patterns: [
      /yönetimin\s*gözden\s*geçirme/i,
      /management\s*review\s*owner/i,
      /yönetim\s*gözden\s*geçirme\s*sorumlu/i,
    ],
  },
];

function cleanRoleValue(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/^[-–—|]+\s*/, "").trim();
}

function pickNameFromLine(line: string, pattern: RegExp): string | null {
  const parts = line.split(/\||\t/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const namePart = parts.find((p) => !pattern.test(p));
    if (namePart && namePart.length > 1 && namePart.length < 120) return cleanRoleValue(namePart);
  }
  const colon = line.split(/[:：]/);
  if (colon.length >= 2 && pattern.test(colon[0])) {
    const v = cleanRoleValue(colon.slice(1).join(":"));
    if (v.length > 1 && v.length < 120) return v;
  }
  const after = line.replace(pattern, "").replace(/^[\s:：\-–—|]+/, "").trim();
  if (after.length > 1 && after.length < 120 && !pattern.test(after)) return cleanRoleValue(after);
  return null;
}

/** Parse role holders from Word-extracted plain text (tables → pipe-separated lines). */
export function parseOrganizationRolesFromText(text: string): Partial<Record<OrganizationWizardRoleKey, string>> {
  const out: Partial<Record<OrganizationWizardRoleKey, string>> = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    for (const { key, patterns } of ROLE_PATTERNS) {
      if (out[key]) continue;
      for (const pattern of patterns) {
        if (!pattern.test(line)) continue;
        const name = pickNameFromLine(line, pattern);
        if (name) out[key] = name;
        break;
      }
    }
  }
  return out;
}

export function buildOrganizationAnswersPatch(
  text: string,
  meta: { fileId?: string; fileName?: string },
): Record<string, unknown> {
  const roles = parseOrganizationRolesFromText(text);
  const patch: Record<string, unknown> = {
    organizationStructureText: text.trim(),
    organizationRolesSyncedAt: new Date().toISOString(),
    organizationGeneratedByAi: false,
    organizationChartText: null,
    organizationRolesMatrixText: null,
  };
  if (meta.fileId) patch.organizationRolesUploadedFileId = meta.fileId;
  if (meta.fileName) patch.organizationRolesFileName = meta.fileName;
  for (const key of ORGANIZATION_WIZARD_ROLE_KEYS) {
    if (roles[key]) patch[key] = roles[key];
  }
  return patch;
}

const ORG_FILE_HINTS = [
  "organizasyon",
  "organization",
  "sorumluluk",
  "responsib",
  "org chart",
  "rol",
  "roles",
  "5.3",
  "organizasyon şeması",
  "organizasyon semasi",
];

function matchesOrgHint(value: string): boolean {
  const v = value.toLowerCase();
  return ORG_FILE_HINTS.some((h) => v.includes(h));
}

export async function findOrganizationRolesUpload(companyId: string) {
  const files = await prisma.uploadedFile.findMany({
    where: {
      companyId,
      deletedAt: null,
      mimeType: {
        in: [
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
          "application/pdf",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      fileName: true,
      textExtract: true,
      mimeType: true,
      storageKey: true,
      extension: true,
    },
  });
  return files.find((f) => matchesOrgHint(f.fileName)) ?? null;
}

export async function findOrganizationQmsText(companyId: string): Promise<string | null> {
  const docs = await prisma.qMSDocument.findMany({
    where: { companyId, deletedAt: null },
    select: { code: true, title: true, content: true },
  });
  for (const d of docs) {
    const label = `${d.code ?? ""} ${d.title}`;
    if (matchesOrgHint(label) && d.content?.trim()) return d.content.trim();
  }
  return null;
}
