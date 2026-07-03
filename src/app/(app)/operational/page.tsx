import { requireCompany } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { OPERATIONAL_HUB_ITEMS, OPERATIONAL_MODULES } from "@/lib/operational/modules";
import type { OperationalModuleSlug } from "@/lib/operational/modules";
import { OperationalHubView } from "./operational-hub-view";

export default async function OperationalHubPage() {
  const ctx = await requireCompany();

  const [recordCounts, recordOpenCounts, capaTotal, capaOpen, complaintTotal, complaintOpen, iaTotal, iaOpen] =
    await Promise.all([
      prisma.qmsOperationalRecord.groupBy({
        by: ["module"],
        where: { companyId: ctx.companyId },
        _count: { _all: true },
      }),
      prisma.qmsOperationalRecord.groupBy({
        by: ["module"],
        where: { companyId: ctx.companyId, status: { not: "CLOSED" } },
        _count: { _all: true },
      }),
      prisma.cAPA.count({ where: { companyId: ctx.companyId } }),
      prisma.cAPA.count({ where: { companyId: ctx.companyId, status: { not: "CLOSED" } } }),
      prisma.complaint.count({ where: { companyId: ctx.companyId } }),
      prisma.complaint.count({ where: { companyId: ctx.companyId, status: { not: "CLOSED" } } }),
      prisma.internalAuditCycle.count({ where: { companyId: ctx.companyId } }),
      prisma.internalAuditCycle.count({
        where: { companyId: ctx.companyId, status: { not: "CLOSED" } },
      }),
    ]);

  const countMap = Object.fromEntries(recordCounts.map((c) => [c.module, c._count._all]));
  const openMap = Object.fromEntries(recordOpenCounts.map((c) => [c.module, c._count._all]));

  const modules = OPERATIONAL_HUB_ITEMS.map((item) => {
    let total = 0;
    let open = 0;
    if (item.slug === "capa") {
      total = capaTotal;
      open = capaOpen;
    } else if (item.slug === "complaints") {
      total = complaintTotal;
      open = complaintOpen;
    } else if (item.slug === "internal-audit") {
      total = iaTotal;
      open = iaOpen;
    } else {
      const def = OPERATIONAL_MODULES[item.slug as OperationalModuleSlug];
      if (def) {
        total = countMap[def.kind] ?? 0;
        open = openMap[def.kind] ?? 0;
      }
    }
    return { item, total, open };
  });

  return <OperationalHubView modules={modules} />;
}
