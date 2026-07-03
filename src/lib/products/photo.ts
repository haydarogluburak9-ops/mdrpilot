import "server-only";
import { prisma } from "@/lib/db";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { writeAuditLog } from "@/lib/audit";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";
import { readImageSize } from "@/lib/exports/logo";

export const PRODUCT_PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PRODUCT_PHOTO_ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg"] as const;

function productPhotoKey(companyId: string, productId: string): string {
  return `products/${companyId}/${productId}/photo`;
}

export async function setProductPhoto(params: {
  companyId: string;
  productId: string;
  userId: string;
  buffer: Buffer;
  mimeType: string;
  ip?: string | null;
}): Promise<{ photoMime: string; updatedAt: string }> {
  const mime = params.mimeType === "image/jpg" ? "image/jpeg" : params.mimeType;
  if (!PRODUCT_PHOTO_ALLOWED_MIME.includes(params.mimeType as (typeof PRODUCT_PHOTO_ALLOWED_MIME)[number])) {
    throw new BadRequestError("Photo must be a PNG or JPEG image");
  }
  if (params.buffer.length > PRODUCT_PHOTO_MAX_BYTES) {
    throw new BadRequestError("Photo exceeds the 5 MB size limit");
  }
  if (!readImageSize(params.buffer)) {
    throw new BadRequestError("Unsupported or corrupt image file");
  }

  const product = await prisma.product.findFirst({
    where: { id: params.productId, companyId: params.companyId, deletedAt: null },
    select: { id: true, photoKey: true },
  });
  if (!product) throw new NotFoundError();

  const key = productPhotoKey(params.companyId, params.productId);
  await getUploadsStorage().save(key, params.buffer);

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { photoKey: key, photoMime: mime },
    select: { updatedAt: true },
  });

  await writeAuditLog({
    action: "product.photo.update",
    userId: params.userId,
    companyId: params.companyId,
    entity: "Product",
    entityId: product.id,
    metadata: { mime, size: params.buffer.length },
    ip: params.ip,
  });

  return { photoMime: mime, updatedAt: updated.updatedAt.toISOString() };
}

export async function removeProductPhoto(params: {
  companyId: string;
  productId: string;
  userId: string;
  ip?: string | null;
}): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: params.productId, companyId: params.companyId, deletedAt: null },
    select: { id: true, photoKey: true },
  });
  if (!product) throw new NotFoundError();

  if (product.photoKey) {
    try {
      await getUploadsStorage().delete(product.photoKey);
    } catch {
      /* best effort */
    }
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { photoKey: null, photoMime: null },
  });

  await writeAuditLog({
    action: "product.photo.remove",
    userId: params.userId,
    companyId: params.companyId,
    entity: "Product",
    entityId: product.id,
    ip: params.ip,
  });
}

export async function loadProductPhotoBuffer(photoKey: string | null | undefined): Promise<Buffer | null> {
  if (!photoKey) return null;
  try {
    if (!(await getUploadsStorage().exists(photoKey))) return null;
    return await getUploadsStorage().read(photoKey);
  } catch {
    return null;
  }
}
