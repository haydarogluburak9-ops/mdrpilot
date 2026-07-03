import { AlignmentType, ImageRun, Paragraph, TextRun } from "docx";
import { parseLiteratureEvidenceMarker } from "@/lib/domain/clinical-literature-evidence-export";
import { scalePhoto } from "../product-photos";
import { readImageSize } from "../logo";

const INK = "111827";

export function tryConsumeLiteratureEvidenceBlock(
  lines: string[],
  start: number,
): { blocks: Paragraph[]; nextIndex: number } | null {
  const line = lines[start]?.trim() ?? "";
  const spec = parseLiteratureEvidenceMarker(line);
  if (!spec?.screenshots?.length) return null;

  const blocks: Paragraph[] = [
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({
          text: spec.title,
          bold: true,
          size: 20,
          color: INK,
        }),
      ],
    }),
  ];

  for (const shot of spec.screenshots) {
    try {
      const data = Buffer.from(shot.base64, "base64");
      const dims = readImageSize(data);
      const size = scalePhoto(dims ?? { width: 800, height: 600 }, 480, 360);
      blocks.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: shot.caption, italics: true, size: 16, color: "4b5563" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data,
              transformation: { width: size.width, height: size.height },
            }),
          ],
        }),
      );
    } catch {
      /* skip bad image */
    }
  }

  return { blocks, nextIndex: start + 1 };
}
