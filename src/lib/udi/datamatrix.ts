import "server-only";

/** Render GS1 Data Matrix as PNG buffer via bwip-js (optional dependency). */
export async function renderDataMatrixPng(text: string, size = 120): Promise<Buffer | null> {
  if (!text.trim()) return null;
  try {
    const bwipjs = await import("bwip-js");
    const png = await bwipjs.default.toBuffer({
      bcid: "datamatrix",
      text,
      scale: 3,
      height: size,
      width: size,
      includetext: false,
    });
    return Buffer.from(png);
  } catch {
    return null;
  }
}
