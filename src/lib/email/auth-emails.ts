import "server-only";
import { sendEmail, appUrl } from "@/lib/email/send";

export async function sendVerificationEmail(email: string, token: string) {
  const link = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  return sendEmail({
    to: email,
    subject: "Verify your MDRpilot email",
    text: `Verify your email: ${link}`,
    html: `<p>Welcome to MDRpilot.</p><p><a href="${link}">Verify your email address</a></p><p>This link expires in 48 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  return sendEmail({
    to: email,
    subject: "Reset your MDRpilot password",
    text: `Reset password: ${link}`,
    html: `<p>We received a password reset request.</p><p><a href="${link}">Reset your password</a></p><p>If you did not request this, ignore this email. Link expires in 2 hours.</p>`,
  });
}

export async function sendTeamInviteEmail(email: string, companyName: string, token: string, inviterName: string) {
  const link = appUrl(`/invite?token=${encodeURIComponent(token)}`);
  return sendEmail({
    to: email,
    subject: `You're invited to ${companyName} on MDRpilot`,
    text: `${inviterName} invited you to ${companyName}. Accept: ${link}`,
    html: `<p><strong>${inviterName}</strong> invited you to join <strong>${companyName}</strong> on MDRpilot.</p><p><a href="${link}">Accept invitation</a></p><p>This invite expires in 7 days.</p>`,
  });
}
