import "server-only";
import { prisma } from "@/lib/db";
import {
  TECHNICAL_FILE_TEMPLATE,
  POST_MARKET_SECTION_TEMPLATE,
  REMOVED_TECHNICAL_FILE_KEYS,
} from "@/lib/domain/constants";

export { REMOVED_TECHNICAL_FILE_KEYS } from "@/lib/domain/constants";

const KEYS_TO_DELETE = [...REMOVED_TECHNICAL_FILE_KEYS];

/**
 * Align technical-file sections: TF checklist + post-market (PMS tab) sections.
 */
export async function syncTechnicalFileSections(productId: string): Promise<void> {
  const existing = await prisma.technicalFileSection.findMany({
    where: { productId },
    select: { id: true, key: true, content: true },
  });
  const byKey = new Map(existing.map((s) => [s.key, s]));

  const legacyPsurContent =
    byKey.get("psur-pms-report")?.content?.trim() ||
    byKey.get("psur")?.content?.trim() ||
    "";

  await prisma.technicalFileSection.deleteMany({
    where: { productId, key: { in: KEYS_TO_DELETE } },
  });

  const refreshed = await prisma.technicalFileSection.findMany({
    where: { productId },
    select: { id: true, key: true, content: true },
  });
  const keyToId = new Map(refreshed.map((s) => [s.key, s.id]));
  const keyContent = new Map(refreshed.map((s) => [s.key, s.content]));

  let order = 0;
  for (const t of [...TECHNICAL_FILE_TEMPLATE, ...POST_MARKET_SECTION_TEMPLATE]) {
    const id = keyToId.get(t.key);
    if (id) {
      await prisma.technicalFileSection.update({
        where: { id },
        data: { order, title: t.title, annexRef: t.annexRef },
      });
    } else {
      const content =
        t.key === "psur-report" && legacyPsurContent ? legacyPsurContent : null;
      const created = await prisma.technicalFileSection.create({
        data: {
          productId,
          key: t.key,
          title: t.title,
          annexRef: t.annexRef,
          order,
          status: content ? "DRAFT" : "MISSING",
          content,
        },
      });
      keyToId.set(t.key, created.id);
      keyContent.set(t.key, content);
    }
    order++;
  }

  if (legacyPsurContent) {
    const reportId = keyToId.get("psur-report");
    const reportContent = keyContent.get("psur-report");
    if (reportId && !reportContent?.trim()) {
      await prisma.technicalFileSection.update({
        where: { id: reportId },
        data: { content: legacyPsurContent, status: "DRAFT" },
      });
    }
  }
}
