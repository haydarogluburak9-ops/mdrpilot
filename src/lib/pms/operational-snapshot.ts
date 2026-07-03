import "server-only";
import { prisma } from "@/lib/db";

export type PmsOperationalSnapshot = {
  periodLabel: string;
  complaintCount: number;
  openComplaints: number;
  capaCount: number;
  openCapas: number;
  vigilanceCount: number;
  openVigilance: number;
  fscaCount: number;
  seriousIncidents: number;
  complaintSummary: string;
  vigilanceSummary: string;
  capaSummary: string;
};

function mdList(items: string[], empty: string): string {
  if (!items.length) return empty;
  return items.map((i) => `- ${i}`).join("\n");
}

/** Aggregate live operational data for PSUR / CER / PMS sections. */
export async function buildPmsOperationalSnapshot(
  companyId: string,
  productId: string,
  locale: "tr" | "en",
): Promise<PmsOperationalSnapshot> {
  const tr = locale === "tr";
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);

  const [complaints, capas, vigilance, fsca] = await Promise.all([
    prisma.complaint.findMany({
      where: { companyId, productId, receivedAt: { gte: since } },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
    prisma.cAPA.findMany({
      where: { companyId, productId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.qmsOperationalRecord.findMany({
      where: { companyId, productId, module: "VIGILANCE", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.qmsOperationalRecord.findMany({
      where: { companyId, productId, module: "FSCA", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const openComplaints = complaints.filter((c) => c.status !== "CLOSED").length;
  const openCapas = capas.filter((c) => c.status !== "CLOSED").length;
  const openVigilance = vigilance.filter((v) => v.status !== "CLOSED").length;
  const seriousIncidents = vigilance.filter(
    (v) => v.vigilanceSeverity === "DEATH_SERIOUS" || v.vigilanceSeverity === "SERIOUS",
  ).length;

  const complaintLines = complaints.slice(0, 10).map((c) => {
    const date = c.receivedAt.toISOString().slice(0, 10);
    return `${date} | ${c.complaintNo ?? "—"} | ${c.status} | ${c.title}`;
  });

  const vigilanceLines = vigilance.slice(0, 10).map((v) => {
    const date = (v.eventAt ?? v.createdAt).toISOString().slice(0, 10);
    return `${date} | ${v.referenceNo ?? "—"} | ${v.vigilanceSeverity ?? "—"} | ${v.title}`;
  });

  const capaLines = capas.slice(0, 8).map((c) => {
    return `${c.referenceNo ?? "—"} | ${c.status} | ${c.title}`;
  });

  return {
    periodLabel: tr ? "Son 12 ay (canlı veri)" : "Last 12 months (live data)",
    complaintCount: complaints.length,
    openComplaints,
    capaCount: capas.length,
    openCapas,
    vigilanceCount: vigilance.length,
    openVigilance,
    fscaCount: fsca.length,
    seriousIncidents,
    complaintSummary: mdList(
      complaintLines,
      tr ? "Raporlama döneminde kayıtlı şikâyet yok." : "No complaints recorded in reporting period.",
    ),
    vigilanceSummary: mdList(
      vigilanceLines,
      tr ? "Raporlama döneminde vigilans kaydı yok." : "No vigilance records in reporting period.",
    ),
    capaSummary: mdList(
      capaLines,
      tr ? "Raporlama döneminde CAPA kaydı yok." : "No CAPA records in reporting period.",
    ),
  };
}

export function snapshotToPsurContext(snapshot: PmsOperationalSnapshot, locale: "tr" | "en"): string {
  const tr = locale === "tr";
  return [
    tr ? "## Canlı PMS operasyon verisi" : "## Live PMS operational data",
    "",
    tr ? `Dönem: ${snapshot.periodLabel}` : `Period: ${snapshot.periodLabel}`,
    tr
      ? `Şikâyet: ${snapshot.complaintCount} (açık: ${snapshot.openComplaints})`
      : `Complaints: ${snapshot.complaintCount} (open: ${snapshot.openComplaints})`,
    tr
      ? `Vigilans: ${snapshot.vigilanceCount} (ciddi: ${snapshot.seriousIncidents}, açık: ${snapshot.openVigilance})`
      : `Vigilance: ${snapshot.vigilanceCount} (serious: ${snapshot.seriousIncidents}, open: ${snapshot.openVigilance})`,
    tr
      ? `CAPA: ${snapshot.capaCount} (açık: ${snapshot.openCapas}) | FSCA: ${snapshot.fscaCount}`
      : `CAPA: ${snapshot.capaCount} (open: ${snapshot.openCapas}) | FSCA: ${snapshot.fscaCount}`,
    "",
    tr ? "### Şikâyet özeti" : "### Complaint summary",
    snapshot.complaintSummary,
    "",
    tr ? "### Vigilans özeti" : "### Vigilance summary",
    snapshot.vigilanceSummary,
    "",
    tr ? "### CAPA özeti" : "### CAPA summary",
    snapshot.capaSummary,
  ].join("\n");
}
