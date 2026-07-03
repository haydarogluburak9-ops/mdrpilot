import { Prisma, PrismaClient } from "@prisma/client";

// Bump when schema changes require a fresh PrismaClient in dev hot-reload.
const PRISMA_CLIENT_VERSION = 14;

function clinicalEvaluationHasEquivalentDevicesJson(): boolean {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "ClinicalEvaluation");
  return Boolean(model?.fields.some((f) => f.name === "equivalentDevicesDataJson"));
}

// Prisma client singleton (avoids exhausting connections in dev hot-reload).
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClientVersion?: number;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

let prisma = globalForPrisma.prisma ?? createPrismaClient();
const staleDevClient =
  process.env.NODE_ENV !== "production" &&
  (globalForPrisma.prismaClientVersion !== PRISMA_CLIENT_VERSION ||
    !("qmsOperationalRecord" in prisma) ||
    !("internalAuditCycle" in prisma) ||
    !("exportTranslationCache" in prisma) ||
    !("companyInvite" in prisma) ||
    !clinicalEvaluationHasEquivalentDevicesJson());
if (staleDevClient) {
  void prisma.$disconnect().catch(() => undefined);
  prisma = createPrismaClient();
}

export { prisma };

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientVersion = PRISMA_CLIENT_VERSION;
}
