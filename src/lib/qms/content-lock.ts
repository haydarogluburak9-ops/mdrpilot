import type { DocStatus } from "@/lib/domain/types";

/** Approved documents require an explicit revision cycle before content changes. */
export function isQmsContentLocked(status: DocStatus): boolean {
  return status === "APPROVED";
}
