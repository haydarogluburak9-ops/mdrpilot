import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { computeRiskNumbersByCategory } from "@/lib/domain/risk-category-codes";
import {
  normalizeTableERows,
  parseTableERowsJson,
  ruleBasedTableERows,
  tableEHasEvaluations,
  tableERefLabel,
  findTableESeed,
  type RiskPlanTableERow,
  type TableERuleContext,
} from "@/lib/domain/risk-table-e";
import { upsertRiskManagementFile } from "@/lib/products/risk-management-service";
import { createRiskItem, resequenceProductRiskItems } from "@/lib/products/risk-service";

export interface TableEFillResult {
  e1Rows: RiskPlanTableERow[];
  e2Rows: RiskPlanTableERow[];
  source: "rules";
  fmeaLinked: number;
}

function productRuleContext(row: {
  isSterile: boolean;
  containsSoftware: boolean;
  isReusable: boolean;
  shelfLife?: string | null;
  intendedPurpose?: string | null;
  materials?: string | null;
  deviceClass: string;
}): TableERuleContext {
  const isActive = row.deviceClass === "III" || row.deviceClass === "IIb";
  return {
    isActive,
    isSterile: row.isSterile,
    containsSoftware: row.containsSoftware,
    isReusable: row.isReusable,
    shelfLife: row.shelfLife,
    intendedPurpose: row.intendedPurpose,
    materials: row.materials,
  };
}

/** Tablo E satırlarını FMEA risk kodlarıyla çift yönlü bağla. */
export async function syncTableEWithFmea(
  companyId: string,
  productId: string,
  e1Rows: RiskPlanTableERow[],
  e2Rows: RiskPlanTableERow[],
  locale: "tr" | "en" = "tr",
): Promise<number> {
  const items = await prisma.riskItem.findMany({
    where: { productId },
    orderBy: { sequenceNo: "asc" },
  });
  const byRef = new Map(items.filter((i) => i.tableERef).map((i) => [i.tableERef!, i]));
  const byRiskNo = new Map<string, typeof items[number]>();
  for (const i of items) {
    const key = i.riskNo?.trim().toUpperCase();
    if (key) byRiskNo.set(key, i);
  }

  let linked = 0;
  const allRows = [...e1Rows, ...e2Rows];

  for (const row of allRows) {
    if (row.status !== "A") {
      row.linkedRiskNo = "";
      continue;
    }

    const seed = findTableESeed(row.id);
    const hazardLabel = locale === "tr" ? row.hazardTr : row.hazardEn;
    const refLabel = tableERefLabel(row.table, locale);
    const linkedRef = `${refLabel} — ${row.id}`;

    let item = byRef.get(row.id);
    if (!item && row.linkedRiskNo?.trim()) {
      item = byRiskNo.get(row.linkedRiskNo.trim().toUpperCase());
    }

    if (!item) {
      const created = await createRiskItem(companyId, productId, {
        hazard: hazardLabel.slice(0, 500),
        hazardousSituation: hazardLabel,
        harm: locale === "tr" ? "Hasta / kullanıcı zararı" : "Patient / user harm",
        riskSource: refLabel,
        tableERef: row.id,
        linkedReferences: linkedRef,
        initialSeverity: 3,
        initialProbability: 2,
      });
      if (created) {
        const fresh = await prisma.riskItem.findUnique({ where: { id: created.id } });
        if (fresh) {
          item = fresh;
          byRef.set(row.id, fresh);
        }
      }
    } else if (!item.tableERef) {
      await prisma.riskItem.update({
        where: { id: item.id },
        data: {
          tableERef: row.id,
          linkedReferences: item.linkedReferences?.trim() ? item.linkedReferences : linkedRef,
          riskSource: item.riskSource?.trim() ? item.riskSource : refLabel,
        },
      });
    }

    if (item) linked++;
  }

  await resequenceProductRiskItems(productId);

  const freshItems = await prisma.riskItem.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
    select: { id: true, riskNo: true, tableERef: true, riskSource: true },
  });
  const riskNos = computeRiskNumbersByCategory(freshItems);

  for (const row of allRows) {
    if (row.status !== "A") continue;
    const item = freshItems.find((i) => i.tableERef === row.id);
    if (item) row.linkedRiskNo = riskNos.get(item.id) ?? item.riskNo ?? "";
  }

  return linked;
}

export async function fillTableEForProduct(
  productId: string,
  companyId: string,
  options: { locale?: string; overwrite?: boolean; linkFmea?: boolean } = {},
): Promise<TableEFillResult> {
  const locale = options.locale === "en" ? "en" : "tr";
  const overwrite = options.overwrite ?? false;
  const linkFmea = options.linkFmea ?? true;

  const row = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: { riskManagementFile: true },
  });
  if (!row) throw new NotFoundError("Product not found");

  const ctx = productRuleContext(row);
  let e1Rows = parseTableERowsJson(row.riskManagementFile?.planTableE1Rows, "E1", locale);
  let e2Rows = parseTableERowsJson(row.riskManagementFile?.planTableE2Rows, "E2", locale);

  if (overwrite || !tableEHasEvaluations(e1Rows)) {
    e1Rows = ruleBasedTableERows("E1", ctx, locale);
  }
  if (overwrite || !tableEHasEvaluations(e2Rows)) {
    e2Rows = ruleBasedTableERows("E2", ctx, locale);
  }

  let fmeaLinked = 0;
  if (linkFmea) {
    fmeaLinked = await syncTableEWithFmea(companyId, productId, e1Rows, e2Rows, locale);
  }

  await upsertRiskManagementFile(companyId, productId, {
    planTableE1Rows: e1Rows,
    planTableE2Rows: e2Rows,
  });

  return { e1Rows, e2Rows, source: "rules", fmeaLinked };
}

export function mergeTableERows(
  stored: unknown,
  table: "E1" | "E2",
  patch: RiskPlanTableERow[],
  locale: "tr" | "en",
): RiskPlanTableERow[] {
  const base = parseTableERowsJson(stored, table, locale);
  const byId = new Map(patch.map((r) => [r.id, r]));
  return base.map((r) => {
    const p = byId.get(r.id);
    if (!p) return r;
    return {
      ...r,
      status: p.status,
      justificationTr: p.justificationTr,
      justificationEn: p.justificationEn,
      linkedRiskNo: p.linkedRiskNo ?? r.linkedRiskNo,
    };
  });
}
