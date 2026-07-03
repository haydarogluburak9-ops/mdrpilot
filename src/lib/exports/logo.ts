import "server-only";
import { prisma } from "@/lib/db";
import { getUploadsStorage } from "@/lib/storage/storage-provider";

export type LogoType = "png" | "jpg";

export interface CompanyLogo {
  data: Buffer;
  width: number;
  height: number;
  type: LogoType;
}

/**
 * Minimal PNG/JPEG dimension reader (no external dependency). Returns the
 * intrinsic pixel size so renderers can preserve aspect ratio. Returns null for
 * unsupported/corrupt data.
 */
export function readImageSize(buf: Buffer): { width: number; height: number; type: LogoType } | null {
  // PNG: signature 89 50 4E 47 0D 0A 1A 0A, IHDR width@16, height@20 (big-endian).
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), type: "png" };
  }
  // JPEG: starts with FF D8; scan segments for a Start-Of-Frame marker.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      // SOF0..SOF15 except DHT(C4), DNL(C8), DRI(CC) carry frame dimensions.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = buf.readUInt16BE(off + 5);
        const width = buf.readUInt16BE(off + 7);
        return { width, height, type: "jpg" };
      }
      const segLen = buf.readUInt16BE(off + 2);
      if (segLen < 2) break;
      off += 2 + segLen;
    }
  }
  return null;
}

export function mimeToLogoType(mime: string | null): LogoType | null {
  if (!mime) return null;
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  return null;
}

/** Loads the company's stored logo (company-isolated), or null if none/invalid. */
export async function loadCompanyLogo(companyId: string): Promise<CompanyLogo | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { logoKey: true, logoMime: true },
  });
  if (!company?.logoKey) return null;

  try {
    const storage = getUploadsStorage();
    if (!(await storage.exists(company.logoKey))) {
      console.warn("[loadCompanyLogo] missing file for key", company.logoKey);
      return null;
    }

    const data = await storage.read(company.logoKey);
    const size = readImageSize(data);
    if (size) {
      return { data, width: size.width, height: size.height, type: size.type };
    }

    const typeFromMime = mimeToLogoType(company.logoMime);
    if (typeFromMime) {
      return { data, width: 320, height: 120, type: typeFromMime };
    }

    console.warn("[loadCompanyLogo] unsupported image format", company.logoKey, company.logoMime);
    return null;
  } catch (err) {
    console.error("[loadCompanyLogo] failed", companyId, err);
    return null;
  }
}

/** Options for docx ImageRun from a loaded company logo. */
export function logoImageRunOptions(logo: CompanyLogo, maxWidth: number, maxHeight: number) {
  return {
    data: logo.data,
    transformation: scaledLogo(logo, maxWidth, maxHeight),
  };
}

/**
 * Scales the logo into a bounding box (in px) while keeping aspect ratio.
 * Used by DOCX (which needs explicit dimensions).
 */
export function scaledLogo(logo: CompanyLogo, maxWidth: number, maxHeight: number): { width: number; height: number } {
  const ratio = Math.min(maxWidth / logo.width, maxHeight / logo.height, 1);
  return { width: Math.round(logo.width * ratio), height: Math.round(logo.height * ratio) };
}
