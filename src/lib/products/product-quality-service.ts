import "server-only";
import { prisma } from "@/lib/db";
import {
  buildCerReminder,
  buildPsurReminder,
  buildVigilanceDeadline,
  type RegulatoryReminder,
} from "@/lib/compliance/regulatory-calendar";
import type { DeviceClass } from "@/lib/domain/types";
import { inferVigilanceSeverity } from "@/lib/operational/vigilance-deadlines";

export type ProductQualityRecord = {
  id: string;
  kind: "complaint" | "capa" | "ncp" | "vigilance" | "fsca" | "change-control";
  referenceNo: string | null;
  title: string;
  status: string;
  updatedAt: string;
  href: string;
  dueDate?: string | null;
};

export async function loadProductQualityBundle(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: {
      id: true,
      name: true,
      deviceClass: true,
      clinicalEvaluation: {
        select: { approvedAt: true, status: true },
      },
      technicalSections: {
        where: { key: { in: ["psur-report", "pms-plan"] } },
        select: { key: true, status: true, updatedAt: true },
      },
    },
  });
  if (!product) return null;

  const [complaints, capas, operational] = await Promise.all([
    prisma.complaint.findMany({
      where: { companyId, productId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.cAPA.findMany({
      where: { companyId, productId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.qmsOperationalRecord.findMany({
      where: {
        companyId,
        productId,
        module: { in: ["NCP", "VIGILANCE", "FSCA", "CHANGE_CONTROL"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const records: ProductQualityRecord[] = [
    ...complaints.map((c) => ({
      id: c.id,
      kind: "complaint" as const,
      referenceNo: c.complaintNo,
      title: c.title,
      status: c.status,
      updatedAt: c.updatedAt.toISOString(),
      href: `/operational/complaints?record=complaint:${c.id}`,
    })),
    ...capas.map((c) => ({
      id: c.id,
      kind: "capa" as const,
      referenceNo: c.referenceNo,
      title: c.title,
      status: c.status,
      updatedAt: c.updatedAt.toISOString(),
      dueDate: c.dueDate?.toISOString() ?? null,
      href: `/operational/capa?record=capa:${c.id}`,
    })),
    ...operational.map((r) => {
      const slug =
        r.module === "NCP"
          ? "ncp"
          : r.module === "VIGILANCE"
            ? "vigilance"
            : r.module === "FSCA"
              ? "fsca"
              : "change-control";
      return {
        id: r.id,
        kind: slug as ProductQualityRecord["kind"],
        referenceNo: r.referenceNo,
        title: r.title,
        status: r.status,
        updatedAt: r.updatedAt.toISOString(),
        dueDate: r.dueDate?.toISOString() ?? null,
        href: `/operational/${slug}?record=${slug}:${r.id}`,
      };
    }),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    productId: product.id,
    productName: product.name,
    deviceClass: product.deviceClass as DeviceClass,
    records,
    counts: {
      complaints: complaints.length,
      capas: capas.length,
      ncp: operational.filter((r) => r.module === "NCP").length,
      vigilance: operational.filter((r) => r.module === "VIGILANCE").length,
      fsca: operational.filter((r) => r.module === "FSCA").length,
      changeControl: operational.filter((r) => r.module === "CHANGE_CONTROL").length,
    },
  };
}

export function buildProductRegulatoryReminders(input: {
  deviceClass: DeviceClass;
  cerApprovedAt?: string | null;
  psurSection?: { status: string; updatedAt: Date } | null;
  vigilanceRecords: Array<{
    id: string;
    title: string;
    description: string | null;
    eventAt: Date | null;
    dueDate: Date | null;
    status: string;
  }>;
  locale: "tr" | "en";
}): RegulatoryReminder[] {
  const psurSection = input.psurSection;
  const reminders: RegulatoryReminder[] = [
    buildCerReminder({
      deviceClass: input.deviceClass,
      cerApprovedAt: input.cerApprovedAt,
      locale: input.locale,
    }),
    buildPsurReminder({
      deviceClass: input.deviceClass,
      psurApprovedAt: psurSection?.status === "APPROVED" ? psurSection.updatedAt.toISOString() : null,
      psurSectionUpdatedAt: psurSection?.updatedAt.toISOString(),
      locale: input.locale,
    }),
  ];

  for (const v of input.vigilanceRecords) {
    if (v.status === "CLOSED" || !v.eventAt) continue;
    const severity = inferVigilanceSeverity(v.title, v.description);
    reminders.push({
      ...buildVigilanceDeadline({
        eventAt: v.eventAt.toISOString(),
        severity,
        reportedAt: v.dueDate && v.status !== "OPEN" ? v.dueDate.toISOString() : null,
        locale: input.locale,
      }),
      title: `${reminders.length > 2 ? "" : ""}${input.locale === "tr" ? "Vigilans" : "Vigilance"}: ${v.title}`.slice(0, 120),
    });
  }

  return reminders;
}

export async function loadProductRegulatoryReminders(
  companyId: string,
  productId: string,
  locale: "tr" | "en",
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: {
      deviceClass: true,
      clinicalEvaluation: { select: { approvedAt: true } },
      technicalSections: {
        where: { key: "psur-report" },
        select: { status: true, updatedAt: true },
        take: 1,
      },
    },
  });
  if (!product) return [];

  const vigilance = await prisma.qmsOperationalRecord.findMany({
    where: { companyId, productId, module: "VIGILANCE", status: { not: "CLOSED" } },
    select: { id: true, title: true, description: true, eventAt: true, dueDate: true, status: true },
    take: 10,
  });

  return buildProductRegulatoryReminders({
    deviceClass: product.deviceClass as DeviceClass,
    cerApprovedAt: product.clinicalEvaluation?.approvedAt?.toISOString(),
    psurSection: product.technicalSections[0] ?? null,
    vigilanceRecords: vigilance,
    locale,
  });
}
