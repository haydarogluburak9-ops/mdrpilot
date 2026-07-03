import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { ipFromRequest } from "@/lib/audit";
import { createComposerDocument } from "@/lib/composer/service";
import { COMPOSER_TYPES } from "@/lib/composer/types";
import type { DocumentComposerType } from "@prisma/client";

export const runtime = "nodejs";

const VALUES = COMPOSER_TYPES.map((t) => t.value) as [DocumentComposerType, ...DocumentComposerType[]];

const schema = z.object({
  productId: z.string().optional().nullable(),
  type: z.enum(VALUES),
  title: z.string().max(200).optional(),
  instructions: z.string().max(2000).optional(),
  language: z.enum(["tr", "en"]).default("en"),
});

// POST /api/composer/generate — generate a new document draft (min role CONSULTANT).
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    if (!rateLimit(clientKey(req, "composer")).ok) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const doc = await createComposerDocument({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      type: parsed.data.type,
      productId: parsed.data.productId ?? undefined,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      language: parsed.data.language,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      document: {
        id: doc.id, title: doc.title, type: doc.type, status: doc.status, version: doc.version,
        aiConfidence: doc.aiConfidence, contentMarkdown: doc.contentMarkdown,
      },
    }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer/generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
