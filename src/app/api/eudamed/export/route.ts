import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import {
  buildUdiDeviceCsv,
  buildUdiDeviceXml,
  buildVigilanceReportCsv,
} from "@/lib/eudamed/export-packages";
import { eudamedApiStatus } from "@/lib/eudamed/config";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "vigilance-csv";
    const productId = url.searchParams.get("productId");
    const locale = url.searchParams.get("locale") === "en" ? "en" : "tr";

    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { name: true, srnNumber: true },
    });
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (type === "udi-xml" || type === "udi-csv") {
      if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
      const product = await prisma.product.findFirst({
        where: { id: productId, companyId: ctx.companyId, deletedAt: null },
        select: {
          name: true,
          deviceClass: true,
          udiDi: true,
          basicUdiDi: true,
          emdnCode: true,
        },
      });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

      const payload = {
        tradeName: product.name,
        udiDi: product.udiDi ?? product.basicUdiDi,
        deviceClass: product.deviceClass,
        emdn: product.emdnCode,
        issuingAgency: "GS1",
      };

      if (type === "udi-xml") {
        const xml = buildUdiDeviceXml(payload, company);
        return new NextResponse(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Content-Disposition": `attachment; filename="udi-${productId}.xml"`,
          },
        });
      }

      const csv = buildUdiDeviceCsv(payload, company);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="udi-${productId}.csv"`,
        },
      });
    }

    const vigilance = await prisma.qmsOperationalRecord.findMany({
      where: { companyId: ctx.companyId, module: "VIGILANCE" },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const csv = buildVigilanceReportCsv(
      vigilance.map((v) => ({
        referenceNo: v.referenceNo,
        title: v.title,
        eventAt: v.eventAt?.toISOString() ?? null,
        dueDate: v.dueDate?.toISOString() ?? null,
        severity: v.vigilanceSeverity,
        status: v.status,
      })),
    );

    return NextResponse.json({
      apiStatus: eudamedApiStatus(locale),
      vigilanceCsv: csv,
      recordCount: vigilance.length,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
