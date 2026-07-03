import "server-only";
import { prisma } from "@/lib/db";

const DEFAULT_ROLES = [
  "Kalite Müdürü",
  "Üretim Sorumlusu",
  "Tasarım Yetkilisi",
  "PRRC",
  "Tüm ilgili personel",
];

/** Create training competency rows when an SOP is approved / revised. */
export async function scheduleTrainingForProcedureRevision(input: {
  companyId: string;
  procedureCode: string;
  revisionNo: number;
}) {
  const code = input.procedureCode.trim().toUpperCase();
  if (!code.startsWith("SOP-")) return { created: 0 };

  const due = new Date();
  due.setDate(due.getDate() + 30);

  let created = 0;
  for (const roleLabel of DEFAULT_ROLES) {
    const existing = await prisma.trainingCompetency.findFirst({
      where: {
        companyId: input.companyId,
        procedureCode: code,
        roleLabel,
        status: "PENDING",
      },
    });
    if (existing) continue;

    await prisma.trainingCompetency.create({
      data: {
        companyId: input.companyId,
        procedureCode: code,
        roleLabel,
        required: true,
        nextDueAt: due,
        status: "PENDING",
      },
    });
    created += 1;
  }

  return { created, revisionNo: input.revisionNo };
}

export async function listTrainingCompetencies(companyId: string) {
  return prisma.trainingCompetency.findMany({
    where: { companyId },
    orderBy: [{ status: "asc" }, { nextDueAt: "asc" }],
  });
}

export async function completeTrainingCompetency(input: {
  companyId: string;
  id: string;
  personName?: string;
  trainingRecordId?: string;
}) {
  const row = await prisma.trainingCompetency.findFirst({
    where: { id: input.id, companyId: input.companyId },
  });
  if (!row) throw new Error("Not found");

  const nextDue = new Date();
  nextDue.setFullYear(nextDue.getFullYear() + 1);

  return prisma.trainingCompetency.update({
    where: { id: row.id },
    data: {
      personName: input.personName ?? row.personName,
      trainingRecordId: input.trainingRecordId ?? row.trainingRecordId,
      lastTrainedAt: new Date(),
      nextDueAt: nextDue,
      status: "COMPLETE",
    },
  });
}
