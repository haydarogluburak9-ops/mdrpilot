import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { createAuthToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email/auth-emails";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email().max(160) });

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "forgot-password")).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid email enumeration
  if (user?.passwordHash) {
    const token = await createAuthToken(user.id, "PASSWORD_RESET", 2);
    await sendPasswordResetEmail(email, token);
  }

  return NextResponse.json({ ok: true });
}
