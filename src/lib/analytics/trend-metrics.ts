import "server-only";
import { prisma } from "@/lib/db";

export type TrendMetric = {
  label: string;
  value: number;
  trend: "up" | "down" | "flat";
  href?: string;
};

/** SOP-DA aligned operational trend metrics for quality data analysis. */
export async function collectQualityTrendMetrics(companyId: string): Promise<TrendMetric[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const [complaints, capas, vigilance, calibration, openCapa] = await Promise.all([
    prisma.complaint.count({ where: { companyId, receivedAt: { gte: since } } }),
    prisma.cAPA.count({ where: { companyId, createdAt: { gte: since } } }),
    prisma.qmsOperationalRecord.count({
      where: { companyId, module: "VIGILANCE", createdAt: { gte: since } },
    }),
    prisma.qmsOperationalRecord.count({
      where: { companyId, module: "CALIBRATION", createdAt: { gte: since } },
    }),
    prisma.cAPA.count({
      where: { companyId, status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] } },
    }),
  ]);

  const prevSince = new Date(since);
  prevSince.setMonth(prevSince.getMonth() - 6);
  const prevComplaints = await prisma.complaint.count({
    where: { companyId, receivedAt: { gte: prevSince, lt: since } },
  });

  const complaintTrend: TrendMetric["trend"] =
    complaints > prevComplaints ? "up" : complaints < prevComplaints ? "down" : "flat";

  return [
    {
      label: "complaints_6m",
      value: complaints,
      trend: complaintTrend,
      href: "/operational/complaints",
    },
    { label: "capa_6m", value: capas, trend: "flat", href: "/operational/capa" },
    { label: "vigilance_6m", value: vigilance, trend: "flat", href: "/operational/vigilance" },
    { label: "calibration_records", value: calibration, trend: "flat", href: "/operational/calibration" },
    { label: "open_capa", value: openCapa, trend: openCapa > 5 ? "up" : "flat", href: "/operational/capa" },
  ];
}
