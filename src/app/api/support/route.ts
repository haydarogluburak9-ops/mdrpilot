import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { saveSupportAttachments } from "@/lib/support/attachments";
import { SUPPORT_MAX_FILES } from "@/lib/support/constants";

export const runtime = "nodejs";

const fieldsSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(8000),
  email: z.string().email().max(160).optional(),
  name: z.string().max(120).optional(),
});

async function parseRequest(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const parsed = fieldsSchema.safeParse({
      subject: form.get("subject"),
      message: form.get("message"),
      email: form.get("email") || undefined,
      name: form.get("name") || undefined,
    });
    return { parsed, files };
  }

  const parsed = fieldsSchema.safeParse(await req.json().catch(() => null));
  return { parsed, files: [] as File[] };
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    const { parsed, files } = await parseRequest(req);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.email ?? ctx?.user.email;
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (files.length > SUPPORT_MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${SUPPORT_MAX_FILES} files allowed` }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        companyId: ctx?.companyId ?? null,
        userId: ctx?.user?.id ?? null,
        email,
        name: parsed.data.name ?? ctx?.user.name ?? null,
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });

    let attachmentLines = "";
    let emailAttachments: { filename: string; content: Buffer }[] = [];

    if (files.length > 0) {
      const { attachments, buffers } = await saveSupportAttachments(ticket.id, files);
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { attachmentsJson: attachments },
      });
      attachmentLines = attachments.map((a) => `• ${a.fileName} (${Math.round(a.sizeBytes / 1024)} KB)`).join("\n");
      emailAttachments = buffers.map((b) => ({ filename: b.fileName, content: b.buffer }));
    }

    const attachmentBlock = attachmentLines
      ? `\n\nAttachments (${files.length}):\n${attachmentLines}`
      : "";

    await sendEmail({
      to: env.email.supportTo,
      subject: `[Support #${ticket.id.slice(-6)}] ${parsed.data.subject}`,
      text: `From: ${email}\nCompany: ${ctx?.companyId ?? "—"}${attachmentBlock}\n\n${parsed.data.message}`,
      html: `<p><strong>From:</strong> ${email}</p><p><strong>Company:</strong> ${ctx?.companyId ?? "—"}</p>${
        attachmentLines
          ? `<p><strong>Attachments:</strong></p><pre>${attachmentLines}</pre>`
          : ""
      }<hr/><pre>${parsed.data.message}</pre>`,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
    });

    await writeAuditLog({
      action: "support.ticket",
      companyId: ctx?.companyId,
      userId: ctx?.user?.id,
      entity: "SupportTicket",
      entityId: ticket.id,
      metadata: { subject: parsed.data.subject, attachmentCount: files.length },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true, id: ticket.id });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/support]", err);
    return NextResponse.json({ error: message }, { status: status === 500 ? 400 : status });
  }
}
