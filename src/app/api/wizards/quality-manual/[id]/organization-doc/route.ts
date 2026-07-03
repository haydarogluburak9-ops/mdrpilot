import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError, NotFoundError, BadRequestError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { extractText } from "@/lib/files/text-extraction";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { extensionOf } from "@/lib/files/config";
import { updateWizardSession } from "@/lib/wizards/quality-manual/service";
import {
  buildOrganizationAnswersPatch,
  findOrganizationQmsText,
  findOrganizationRolesUpload,
} from "@/lib/wizards/quality-manual/organization-from-word";

export const runtime = "nodejs";

const bodySchema = z.object({
  uploadedFileId: z.string().min(1).optional(),
  syncFromCompany: z.boolean().optional(),
});

async function textFromUpload(companyId: string, fileId: string): Promise<{ text: string; fileName: string }> {
  const file = await prisma.uploadedFile.findFirst({
    where: { id: fileId, companyId, deletedAt: null },
  });
  if (!file) throw new NotFoundError("File not found");

  let text = file.textExtract?.trim() ?? "";
  if (!text && file.storageKey) {
    const ext = (file.extension ?? extensionOf(file.fileName)).toLowerCase();
    const kindMap: Record<string, "pdf" | "docx"> = { pdf: "pdf", docx: "docx", doc: "docx" };
    const kind = kindMap[ext];
    if (kind) {
      const buf = await getUploadsStorage().read(file.storageKey);
      text = await extractText(kind, buf);
      if (text) {
        await prisma.uploadedFile.update({
          where: { id: file.id },
          data: { textExtract: text },
        });
      }
    }
  }
  if (!text.trim()) throw new BadRequestError("Could not extract text from this file. Use Word (.docx) or PDF.");
  return { text, fileName: file.fileName };
}

// POST — link roles & responsibilities Word/PDF and auto-fill organization wizard fields.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    let text = "";
    let fileId: string | undefined;
    let fileName: string | undefined;

    if (parsed.data.uploadedFileId) {
      const loaded = await textFromUpload(ctx.companyId, parsed.data.uploadedFileId);
      text = loaded.text;
      fileId = parsed.data.uploadedFileId;
      fileName = loaded.fileName;
    } else if (parsed.data.syncFromCompany) {
      const upload = await findOrganizationRolesUpload(ctx.companyId);
      if (upload?.textExtract?.trim()) {
        text = upload.textExtract.trim();
        fileId = upload.id;
        fileName = upload.fileName;
      } else if (upload) {
        const loaded = await textFromUpload(ctx.companyId, upload.id);
        text = loaded.text;
        fileId = upload.id;
        fileName = loaded.fileName;
      } else {
        const qmsText = await findOrganizationQmsText(ctx.companyId);
        if (qmsText) {
          text = qmsText;
          fileName = "QMS document";
        }
      }
      if (!text.trim()) {
        return NextResponse.json(
          {
            error:
              "No organization / roles document found. Upload a Word file whose name contains organizasyon, sorumluluk or roles.",
          },
          { status: 404 },
        );
      }
    } else {
      return NextResponse.json({ error: "uploadedFileId or syncFromCompany required" }, { status: 400 });
    }

    const answersPatch = buildOrganizationAnswersPatch(text, { fileId, fileName });
    const session = await updateWizardSession({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      id: params.id,
      answers: answersPatch,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      answers: answersPatch,
      session: { id: session.id, currentStep: session.currentStep, status: session.status },
      file: fileId ? { id: fileId, fileName } : undefined,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual/organization-doc]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
