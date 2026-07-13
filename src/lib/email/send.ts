import "server-only";
import { env } from "@/lib/env";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

/** Send transactional email. Logs to console in dev when no provider is configured. */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; provider: string }> {
  const from = env.email.from;
  const replyTo = env.email.supportTo;

  if (env.email.resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.email.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        reply_to: replyTo,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString("base64"),
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Resend error", res.status, body.slice(0, 300));
      return { ok: false, provider: "resend" };
    }
    return { ok: true, provider: "resend" };
  }

  // Dev / fallback: log link so flows work without SMTP
  console.info("[email] (console)", {
    to: input.to,
    subject: input.subject,
    preview: input.text ?? input.html.replace(/<[^>]+>/g, " ").slice(0, 200),
  });
  return { ok: true, provider: "console" };
}

export function appUrl(path: string): string {
  const base = env.appUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
