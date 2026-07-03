import "server-only";
import fs from "fs";
import path from "path";
import { readImageSize } from "./logo";

const PUBLIC_DIR = path.join(process.cwd(), "public", "product-photos");

/** Normalise a model code for filesystem lookup (e.g. "YM – 15A" → "ym-15a"). */
export function modelPhotoSlug(modelName: string): string {
  return modelName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Optional per-model images in public/product-photos/{slug}.png|.jpg
 * Falls back when no uploaded product photo is set for that row.
 */
export function loadModelPhotoFromPublic(modelName: string): { data: Buffer; width: number; height: number } | null {
  const slug = modelPhotoSlug(modelName);
  if (!slug) return null;
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const file = path.join(PUBLIC_DIR, `${slug}${ext}`);
    try {
      if (!fs.existsSync(file)) continue;
      const data = fs.readFileSync(file);
      const size = readImageSize(data);
      if (!size) continue;
      return { data, width: size.width, height: size.height };
    } catch {
      continue;
    }
  }
  return null;
}

export function scalePhoto(image: { width: number; height: number }, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / image.width, maxH / image.height, 1);
  return { width: Math.max(1, Math.round(image.width * ratio)), height: Math.max(1, Math.round(image.height * ratio)) };
}
