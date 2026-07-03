import "server-only";
import { prisma } from "@/lib/db";

interface AuditInput {
  action: string;
  companyId?: string | null;
  userId?: string | null;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/** Fire-and-forget audit log writer. Never throws into the request path. */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        companyId: input.companyId ?? null,
        userId: input.userId ?? null,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata as object | undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log", err);
  }
}

export function ipFromRequest(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return null;
}
