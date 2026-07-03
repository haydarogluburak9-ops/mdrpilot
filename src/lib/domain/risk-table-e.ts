/** ISO/TR 24971 Tablo E.1 ve E.2 — plan + FMEA bağlantısı. */

import {
  ALL_TABLE_E_SEEDS,
  TABLE_E1_SEEDS,
  TABLE_E2_SEEDS,
  type TableESeed,
} from "./risk-table-e-seeds";

export type TableEStatus = "A" | "N/A" | "";

export interface RiskPlanTableERow {
  id: string;
  table: "E1" | "E2";
  categoryTr: string;
  categoryEn: string;
  groupTr?: string;
  groupEn?: string;
  hazardTr: string;
  hazardEn: string;
  status: TableEStatus;
  justificationTr: string;
  justificationEn: string;
  linkedRiskNo?: string;
}

function seedsFor(table: "E1" | "E2"): TableESeed[] {
  return table === "E1" ? TABLE_E1_SEEDS : TABLE_E2_SEEDS;
}

export function emptyTableERows(table: "E1" | "E2"): RiskPlanTableERow[] {
  return seedsFor(table).map((s) => ({
    id: s.id,
    table: s.table,
    categoryTr: s.categoryTr,
    categoryEn: s.categoryEn,
    groupTr: s.groupTr,
    groupEn: s.groupEn,
    hazardTr: s.hazardTr,
    hazardEn: s.hazardEn,
    status: "",
    justificationTr: "",
    justificationEn: "",
    linkedRiskNo: "",
  }));
}

export function parseTableERowsJson(
  raw: unknown,
  table: "E1" | "E2",
  locale: "tr" | "en" = "tr",
): RiskPlanTableERow[] {
  const defaults = emptyTableERows(table);
  if (!Array.isArray(raw)) return defaults;

  const byId = new Map<string, RiskPlanTableERow>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    if (!id) continue;
    const statusRaw = typeof r.status === "string" ? r.status.trim().toUpperCase() : "";
    const status: TableEStatus =
      statusRaw === "A" || statusRaw === "N/A" ? (statusRaw as TableEStatus) : "";
    byId.set(id, {
      id,
      table,
      categoryTr: typeof r.categoryTr === "string" ? r.categoryTr : "",
      categoryEn: typeof r.categoryEn === "string" ? r.categoryEn : "",
      groupTr: typeof r.groupTr === "string" ? r.groupTr : undefined,
      groupEn: typeof r.groupEn === "string" ? r.groupEn : undefined,
      hazardTr: typeof r.hazardTr === "string" ? r.hazardTr : "",
      hazardEn: typeof r.hazardEn === "string" ? r.hazardEn : "",
      status,
      justificationTr:
        typeof r.justificationTr === "string"
          ? r.justificationTr
          : typeof r.justification === "string"
            ? r.justification
            : "",
      justificationEn: typeof r.justificationEn === "string" ? r.justificationEn : "",
      linkedRiskNo: typeof r.linkedRiskNo === "string" ? r.linkedRiskNo : "",
    });
  }

  return defaults.map((d) => {
    const stored = byId.get(d.id);
    if (!stored) return d;
    return {
      ...d,
      status: stored.status,
      justificationTr: stored.justificationTr || d.justificationTr,
      justificationEn: stored.justificationEn || d.justificationEn,
      linkedRiskNo: stored.linkedRiskNo ?? "",
    };
  });
}

export function tableEHasEvaluations(rows: RiskPlanTableERow[]): boolean {
  return rows.some((r) => r.status === "A" || r.status === "N/A");
}

export function normalizeTableERows(rows: RiskPlanTableERow[]): object[] {
  return rows.map((r) => ({
    id: r.id,
    table: r.table,
    categoryTr: r.categoryTr.slice(0, 200),
    categoryEn: r.categoryEn.slice(0, 200),
    groupTr: r.groupTr?.slice(0, 200),
    groupEn: r.groupEn?.slice(0, 200),
    hazardTr: r.hazardTr.slice(0, 500),
    hazardEn: r.hazardEn.slice(0, 500),
    status: r.status,
    justificationTr: r.justificationTr.slice(0, 4000),
    justificationEn: r.justificationEn.slice(0, 4000),
    linkedRiskNo: r.linkedRiskNo?.slice(0, 32) ?? "",
  }));
}

function na(locale: "tr" | "en") {
  return locale === "tr" ? "Uygulanmaz." : "Not applicable.";
}

export interface TableERuleContext {
  isActive: boolean;
  isSterile: boolean;
  containsSoftware: boolean;
  isReusable: boolean;
  shelfLife?: string | null;
  intendedPurpose?: string | null;
  materials?: string | null;
}

function ruleStatus(seed: TableESeed, ctx: TableERuleContext): TableEStatus | null {
  if (seed.naIfNonActive && !ctx.isActive) return "N/A";
  if (seed.naIfNoSoftware && !ctx.containsSoftware) return "N/A";
  if (seed.naIfNonReusable && !ctx.isReusable) return "N/A";
  if (seed.naIfNonSterile && !ctx.isSterile) return "N/A";
  if (seed.aIfSterile && ctx.isSterile) return "A";
  return null;
}

function inferSeedStatus(seed: TableESeed, ruled: TableEStatus | null): TableEStatus {
  if (ruled) return ruled;
  const note = `${seed.defaultNoteTr ?? ""} ${seed.defaultNoteEn ?? ""}`;
  if (/bulunmamaktadır|mevcut değildir|does not exist|there is no|not an active|out of scope|uygulanam|non biodegradable|do not interpret|do not transfer/i.test(note)) {
    return "N/A";
  }
  if (seed.defaultNoteTr?.trim() || seed.aIfSterile) return "A";
  return "";
}

export function ruleBasedTableERows(
  table: "E1" | "E2",
  ctx: TableERuleContext,
  locale: "tr" | "en" = "tr",
): RiskPlanTableERow[] {
  return seedsFor(table).map((seed) => {
    const ruled = ruleStatus(seed, ctx);
    const status = inferSeedStatus(seed, ruled);
    let justificationTr = seed.defaultNoteTr ?? "";
    let justificationEn = seed.defaultNoteEn ?? "";

    if (status === "N/A" && !justificationTr) justificationTr = na("tr");
    if (status === "N/A" && !justificationEn) justificationEn = na("en");

    // E2 shelf life row heuristic
    if (seed.id === "E2.005" && ctx.shelfLife?.trim()) {
      return {
        id: seed.id,
        table: seed.table,
        categoryTr: seed.categoryTr,
        categoryEn: seed.categoryEn,
        groupTr: seed.groupTr,
        groupEn: seed.groupEn,
        hazardTr: seed.hazardTr,
        hazardEn: seed.hazardEn,
        status: "A",
        justificationTr: locale === "tr" ? `Raf ömrü: ${ctx.shelfLife.trim()}.` : justificationTr,
        justificationEn: locale === "en" ? `Shelf life: ${ctx.shelfLife.trim()}.` : justificationEn,
        linkedRiskNo: "",
      };
    }

    return {
      id: seed.id,
      table: seed.table,
      categoryTr: seed.categoryTr,
      categoryEn: seed.categoryEn,
      groupTr: seed.groupTr,
      groupEn: seed.groupEn,
      hazardTr: seed.hazardTr,
      hazardEn: seed.hazardEn,
      status,
      justificationTr,
      justificationEn,
      linkedRiskNo: "",
    };
  });
}

export function findTableESeed(id: string): TableESeed | undefined {
  return ALL_TABLE_E_SEEDS.find((s) => s.id === id);
}

export function tableERefLabel(table: "E1" | "E2", locale: "tr" | "en") {
  return table === "E1"
    ? locale === "tr"
      ? "Tablo E.1"
      : "Table E.1"
    : locale === "tr"
      ? "Tablo E.2"
      : "Table E.2";
}
