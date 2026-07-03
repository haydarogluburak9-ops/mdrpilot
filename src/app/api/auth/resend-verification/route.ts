import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { createAuthToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email/auth-emails";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!rateLimit(clientKey(req, "resend-verify")).ok) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const ctx = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { emailVerifiedAt: true, email: true },
    });
    if (user?.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const token = await createAuthToken(ctx.user.id, "EMAIL_VERIFY", 48);
    await sendVerificationEmail(user!.email, token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
