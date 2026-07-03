import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const cursor = url.searchParams.get("cursor");
    const action = url.searchParams.get("action");

    const logs = await prisma.auditLog.findMany({
      where: {
        companyId: ctx.companyId,
        ...(action ? { action: { contains: action } } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;

    return NextResponse.json({
      logs: items.map((l) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        metadata: l.metadata,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
        userName: l.user?.name ?? l.user?.email ?? null,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
