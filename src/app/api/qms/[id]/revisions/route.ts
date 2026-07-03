import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import {
  getQmsDocumentRevisionContent,
  listQmsDocumentRevisions,
} from "@/lib/qms/revision-snapshots";
import { diffLineTexts } from "@/lib/qms/revision-diff";

export const runtime = "nodejs";

// GET /api/qms/[id]/revisions — list revision snapshots; ?rev=N returns content
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const doc = await prisma.qMSDocument.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { id: true, revisionNo: true, version: true },
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(req.url);
    const revParam = url.searchParams.get("rev");
    const againstParam = url.searchParams.get("against");
    if (revParam != null) {
      const revisionNo = parseInt(revParam, 10);
      if (Number.isNaN(revisionNo)) {
        return NextResponse.json({ error: "Invalid revision" }, { status: 400 });
      }
      const snap = await getQmsDocumentRevisionContent(doc.id, revisionNo);
      if (!snap) return NextResponse.json({ error: "Revision not found" }, { status: 404 });

      if (againstParam != null) {
        const againstNo = parseInt(againstParam, 10);
        if (Number.isNaN(againstNo)) {
          return NextResponse.json({ error: "Invalid against revision" }, { status: 400 });
        }
        const againstSnap = await getQmsDocumentRevisionContent(doc.id, againstNo);
        if (!againstSnap) {
          return NextResponse.json({ error: "Against revision not found" }, { status: 404 });
        }
        const diff = diffLineTexts(againstSnap.content, snap.content);
        return NextResponse.json({
          revisionNo,
          against: againstNo,
          content: snap.content,
          diff,
        });
      }

      return NextResponse.json({ revisionNo, ...snap });
    }

    const revisions = await listQmsDocumentRevisions(doc.id);
    return NextResponse.json({
      currentRevisionNo: doc.revisionNo,
      currentVersion: doc.version,
      revisions,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
