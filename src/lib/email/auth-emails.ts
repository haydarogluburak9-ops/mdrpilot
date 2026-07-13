import "server-only";
import { sendEmail, appUrl } from "@/lib/email/send";
import { BRAND_NAME, BRAND_DOMAIN, BRAND_SUPPORT_EMAIL } from "@/lib/brand";

function emailShell(params: {
  title: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}): { html: string; text: string } {
  const parasHtml = params.paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.5;color:#1f2937;">${p}</p>`).join("");
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px 28px;border:1px solid #e5e7eb;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">${BRAND_NAME}</p>
          <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#111827;">${params.title}</h1>
          ${parasHtml}
          <p style="margin:24px 0;">
            <a href="${params.ctaUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">${params.ctaLabel}</a>
          </p>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#4b5563;">If the button does not work, copy and paste this link into your browser:</p>
          <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;color:#2563eb;">${params.ctaUrl}</p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">${params.footerNote}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;line-height:1.5;color:#9ca3af;max-width:560px;">
        This message was sent by ${BRAND_NAME} (${BRAND_DOMAIN}) regarding your account.
        Questions? Contact ${BRAND_SUPPORT_EMAIL}. You received this email because an action was taken with this address on ${BRAND_NAME}.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `${BRAND_NAME} — ${params.title}`,
    "",
    ...params.paragraphs,
    "",
    `${params.ctaLabel}: ${params.ctaUrl}`,
    "",
    params.footerNote,
    "",
    `Support: ${BRAND_SUPPORT_EMAIL}`,
    `${BRAND_NAME} · ${BRAND_DOMAIN}`,
  ].join("\n");

  return { html, text };
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  const body = emailShell({
    title: "Verify your email address",
    paragraphs: [
      `Welcome to ${BRAND_NAME}. Thank you for creating an account.`,
      "Please confirm that this email address belongs to you so we can secure your workspace and send important account notices.",
      "This verification link expires in 48 hours. If you did not create an account, you can ignore this message — no further action is required.",
    ],
    ctaLabel: "Verify email address",
    ctaUrl: link,
    footerNote: "For your security, never share this link with anyone.",
  });
  return sendEmail({
    to: email,
    subject: `Verify your ${BRAND_NAME} email`,
    ...body,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  const body = emailShell({
    title: "Reset your password",
    paragraphs: [
      `We received a request to reset the password for your ${BRAND_NAME} account.`,
      "Click the button below to choose a new password. The link expires in 2 hours.",
      "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.",
    ],
    ctaLabel: "Reset password",
    ctaUrl: link,
    footerNote: "For your security, never share this link with anyone.",
  });
  return sendEmail({
    to: email,
    subject: `Reset your ${BRAND_NAME} password`,
    ...body,
  });
}

export async function sendTeamInviteEmail(
  email: string,
  companyName: string,
  token: string,
  inviterName: string,
) {
  const link = appUrl(`/invite?token=${encodeURIComponent(token)}`);
  const safeCompany = companyName.replace(/[<>&]/g, "");
  const safeInviter = inviterName.replace(/[<>&]/g, "");
  const body = emailShell({
    title: `Join ${safeCompany} on ${BRAND_NAME}`,
    paragraphs: [
      `<strong>${safeInviter}</strong> invited you to join the <strong>${safeCompany}</strong> workspace on ${BRAND_NAME}.`,
      `${BRAND_NAME} helps medical device manufacturers prepare MDR and ISO 13485 documentation.`,
      "This invitation expires in 7 days. If you were not expecting this invite, you can ignore this email.",
    ],
    ctaLabel: "Accept invitation",
    ctaUrl: link,
    footerNote: `Questions about this invite? Contact ${BRAND_SUPPORT_EMAIL}.`,
  });
  return sendEmail({
    to: email,
    subject: `You're invited to ${safeCompany} on ${BRAND_NAME}`,
    ...body,
  });
}
