import "server-only";
import { prisma } from "@/lib/db";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { writeAuditLog } from "@/lib/audit";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";
import { readImageSize } from "@/lib/exports/logo";

export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const LOGO_ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg"] as const;

function logoKey(companyId: string): string {
  return `branding/${companyId}/logo`;
}

/** Validates and stores a company logo, returning the updated logo metadata. */
export async function setCompanyLogo(params: {
  companyId: string;
  userId: string;
  buffer: Buffer;
  mimeType: string;
  ip?: string | null;
}): Promise<{ logoMime: string; updatedAt: string }> {
  const mime = params.mimeType === "image/jpg" ? "image/jpeg" : params.mimeType;
  if (!LOGO_ALLOWED_MIME.includes(params.mimeType as (typeof LOGO_ALLOWED_MIME)[number])) {
    throw new BadRequestError("Logo must be a PNG or JPEG image");
  }
  if (params.buffer.length > LOGO_MAX_BYTES) {
    throw new BadRequestError("Logo exceeds the 2 MB size limit");
  }
  // Reject anything that does not actually parse as a PNG/JPEG (defends against spoofed mime).
  if (!readImageSize(params.buffer)) {
    throw new BadRequestError("Unsupported or corrupt image file");
  }

  const company = await prisma.company.findUnique({ where: { id: params.companyId }, select: { id: true } });
  if (!company) throw new NotFoundError();

  const key = logoKey(params.companyId);
  const storage = getUploadsStorage();
  await storage.save(key, params.buffer);

  if (!(await storage.exists(key))) {
    throw new BadRequestError("Logo could not be saved to storage. Please try again.");
  }

  const updated = await prisma.company.update({
    where: { id: params.companyId },
    data: { logoKey: key, logoMime: mime },
    select: { logoMime: true, updatedAt: true },
  });

  await writeAuditLog({
    action: "company.logo.update",
    userId: params.userId,
    companyId: params.companyId,
    entity: "Company",
    entityId: params.companyId,
    metadata: { mime, size: params.buffer.length },
    ip: params.ip,
  });

  return { logoMime: updated.logoMime ?? mime, updatedAt: updated.updatedAt.toISOString() };
}

/** Removes the company logo (storage object + DB pointers). */
export async function removeCompanyLogo(params: { companyId: string; userId: string; ip?: string | null }): Promise<void> {
  const company = await prisma.company.findUnique({ where: { id: params.companyId }, select: { logoKey: true } });
  if (!company) throw new NotFoundError();

  if (company.logoKey) {
    try { await getUploadsStorage().delete(company.logoKey); } catch { /* best effort */ }
  }

  await prisma.company.update({
    where: { id: params.companyId },
    data: { logoKey: null, logoMime: null },
  });

  await writeAuditLog({
    action: "company.logo.remove",
    userId: params.userId,
    companyId: params.companyId,
    entity: "Company",
    entityId: params.companyId,
    ip: params.ip,
  });
}
