import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { purchaseTokenPack } from "@/lib/billing/ai-tokens";
import { TOKEN_PACKS } from "@/lib/billing/plans";

export const runtime = "nodejs";

const schema = z.object({ packKey: z.string().min(1) });

/** POST /api/billing/token-packs — purchase extra AI tokens (OWNER, pilot stub). */
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("OWNER");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await purchaseTokenPack({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      packKey: parsed.data.packKey,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

/** GET /api/billing/token-packs — list available token packs. */
export async function GET() {
  return NextResponse.json({ packs: TOKEN_PACKS });
}
