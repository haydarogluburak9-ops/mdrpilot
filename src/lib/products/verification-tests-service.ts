import "server-only";
import { prisma } from "@/lib/db";
import { mergeSectionExtras } from "@/lib/domain/section-extras";
import {
  DEFAULT_VERIFICATION_TESTS,
  mergeVerificationTests,
  type VerificationTestRecord,
} from "@/lib/domain/verification-tests";

const VV_KEY = "verification-validation";
const SW_KEY = "software-validation";

async function ensureSection(productId: string, key: string, title: string, annexRef: string) {
  const existing = await prisma.technicalFileSection.findFirst({ where: { productId, key } });
  if (existing) return existing;
  return prisma.technicalFileSection.create({
    data: { productId, key, title, annexRef, status: "MISSING", applicable: true },
  });
}

export async function loadVerificationTests(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: {
      id: true,
      isSterile: true,
      containsSoftware: true,
      technicalSections: {
        where: { key: { in: [VV_KEY, SW_KEY] } },
        select: { id: true, key: true, sectionExtrasJson: true, status: true },
      },
    },
  });
  if (!product) return null;

  const vvSection = product.technicalSections.find((s) => s.key === VV_KEY);
  const defaults = DEFAULT_VERIFICATION_TESTS(product);
  const extras = (vvSection?.sectionExtrasJson ?? {}) as { verificationTests?: VerificationTestRecord[] };
  const tests = mergeVerificationTests(extras.verificationTests ?? [], defaults);

  return {
    sectionId: vvSection?.id ?? null,
    softwareSectionId: product.technicalSections.find((s) => s.key === SW_KEY)?.id ?? null,
    tests,
  };
}

export async function saveVerificationTests(
  companyId: string,
  productId: string,
  tests: VerificationTestRecord[],
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!product) return null;

  const section = await ensureSection(
    productId,
    VV_KEY,
    "Product Verification and Validation",
    "Annex II 6.1",
  );

  const prev = (section.sectionExtrasJson ?? {}) as Record<string, unknown>;
  const nextExtras = mergeSectionExtras(
    { verificationTests: (prev.verificationTests as VerificationTestRecord[]) ?? [] },
    { verificationTests: tests },
  );

  const hasPass = tests.some((t) => t.status === "PASS");
  const allDone = tests.every((t) => t.status === "PASS" || t.status === "NA");
  const nextStatus =
    section.status === "APPROVED"
      ? section.status
      : allDone && tests.length > 0
        ? "IN_REVIEW"
        : hasPass
          ? "DRAFT"
          : section.status;

  await prisma.technicalFileSection.update({
    where: { id: section.id },
    data: {
      sectionExtrasJson: nextExtras as object,
      status: nextStatus,
    },
  });

  return { sectionId: section.id, tests };
}
