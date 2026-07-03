import "server-only";
import { fda510kDetailUrl, searchFda510kLive } from "@/lib/integrations/fda-510k-live-search";
import { registryEvidenceUrl } from "@/lib/domain/clinical-cer-premium";
import type { RegistrySearchResult, RegistrySearchStatus } from "@/lib/domain/clinical-literature-model";

const OPENFDA_EVENT = "https://api.fda.gov/device/event.json";
const OPENFDA_RECALL = "https://api.fda.gov/device/recall.json";

function apiKey(url: URL): URL {
  const key = process.env.OPENFDA_API_KEY?.trim();
  if (key) url.searchParams.set("api_key", key);
  return url;
}

function buildDeviceSearchTerms(productName: string, purpose?: string | null): string[] {
  const terms = [productName.trim()];
  const p = purpose?.trim();
  if (p && p.length > 5) terms.push(p.slice(0, 80));
  if (/oftalmik|ophthalmic/i.test(`${productName} ${p ?? ""}`)) terms.push("ophthalmic");
  if (/bıçak|knife|incision/i.test(`${productName} ${p ?? ""}`)) terms.push("incision");
  return Array.from(new Set(terms.filter(Boolean)));
}

function luceneEscape(s: string): string {
  return s.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ").trim();
}

async function fetchOpenFdaCount(
  base: string,
  search: string,
  limit = 5,
): Promise<{ total: number; hits: string[]; apiUrl: string; error?: string }> {
  const url = apiKey(new URL(base));
  url.searchParams.set("search", search);
  url.searchParams.set("limit", String(limit));
  const apiUrl = url.toString();

  try {
    const res = await fetch(apiUrl, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { total: 0, hits: [], apiUrl, error: `HTTP ${res.status} ${body.slice(0, 80)}` };
    }
    const json = (await res.json()) as {
      meta?: { results?: { total?: number } };
      results?: Record<string, unknown>[];
    };
    const total = json.meta?.results?.total ?? json.results?.length ?? 0;
    const hits = (json.results ?? []).slice(0, limit).map((row) => summarizeHit(row));
    return { total, hits, apiUrl };
  } catch (err) {
    return {
      total: 0,
      hits: [],
      apiUrl,
      error: err instanceof Error ? err.message : "openFDA failed",
    };
  }
}

function summarizeHit(row: Record<string, unknown>): string {
  const devices = Array.isArray(row.device) ? row.device : row.device ? [row.device] : [];
  const d0 = devices[0] as Record<string, unknown> | undefined;
  const brand = d0?.brand_name ?? row.brand_name;
  const generic = d0?.generic_name ?? row.generic_name;
  const product = row.product_description ?? row.device_name;
  const reason = row.reason_for_recall ?? row.event_type;
  const date = row.date_received ?? row.recall_initiation_date ?? row.date_of_event;
  const parts = [
    typeof brand === "string" ? brand : null,
    typeof generic === "string" ? generic : null,
    typeof product === "string" ? product : null,
    typeof reason === "string" ? reason : null,
    typeof date === "string" ? date : null,
  ].filter(Boolean);
  return parts.join(" · ").slice(0, 200) || "Record";
}

function statusFromCount(total: number): RegistrySearchStatus {
  if (total <= 0) return "no_signal";
  if (total >= 15) return "records_found";
  return "review_required";
}

export async function searchFdaMaudeLive(
  productName: string,
  purpose?: string | null,
): Promise<{ total: number; hits: string[]; query: string; apiUrl: string; error?: string }> {
  const term = buildDeviceSearchTerms(productName, purpose)[0] ?? productName;
  const q = `device.generic_name:${luceneEscape(term)} OR device.brand_name:${luceneEscape(term)}`;
  const result = await fetchOpenFdaCount(OPENFDA_EVENT, q, 5);
  return { ...result, query: q };
}

export async function searchFdaRecallsLive(
  productName: string,
  purpose?: string | null,
): Promise<{ total: number; hits: string[]; query: string; apiUrl: string; error?: string }> {
  const term = buildDeviceSearchTerms(productName, purpose)[0] ?? productName;
  const q = `product_description:${luceneEscape(term)} OR reason_for_recall:${luceneEscape(term)}`;
  const result = await fetchOpenFdaCount(OPENFDA_RECALL, q, 5);
  return { ...result, query: q };
}

function portalSearchUrl(registryId: string, query: string): string {
  const base = registryEvidenceUrl(registryId);
  if (!base) return query;
  return base;
}

export async function buildLiveRegistryResult(input: {
  registryId: string;
  productName: string;
  purpose: string;
  locale: "tr" | "en";
  searchDate: string;
  riskThemes: string;
}): Promise<RegistrySearchResult> {
  const { registryId, productName, purpose, locale, searchDate, riskThemes } = input;
  const tr = locale === "tr";
  const label = registryId;

  if (registryId === "fda-maude") {
    const live = await searchFdaMaudeLive(productName, purpose);
    const status = statusFromCount(live.total);
    return {
      registryId,
      query: live.query,
      status,
      summary: tr
        ? `Canlı FDA MAUDE (${searchDate}): ${live.total.toLocaleString("tr-TR")} advers olay kaydı. Sorgu: \`${live.query}\`.${live.hits.length ? ` Örnek: ${live.hits[0]}` : ""}`
        : `Live FDA MAUDE (${searchDate}): ${live.total.toLocaleString()} adverse event records. Query: \`${live.query}\`.${live.hits.length ? ` Sample: ${live.hits[0]}` : ""}`,
      recordsScreened: live.total,
      cerComment: tr
        ? `Canlı MAUDE: ${live.total} kayıt; ${productName} için ${status === "no_signal" ? "belirgin sinyal yok" : "manuel inceleme gerekli"}.`
        : `Live MAUDE: ${live.total} records; ${status === "no_signal" ? "no clear signal" : "manual review required"} for ${productName}.`,
      evidenceUrl: live.apiUrl,
      liveVerified: true,
      liveQueryUrl: live.apiUrl,
      liveRecordCount: live.total,
      sampleHits: live.hits,
    };
  }

  if (registryId === "fda-recalls") {
    const live = await searchFdaRecallsLive(productName, purpose);
    const status = statusFromCount(live.total);
    return {
      registryId,
      query: live.query,
      status,
      summary: tr
        ? `Canlı FDA geri çağırma (${searchDate}): ${live.total.toLocaleString("tr-TR")} kayıt.${live.hits.length ? ` Örnek: ${live.hits[0]}` : " Aktif geri çağırma sinyali yok."}`
        : `Live FDA recalls (${searchDate}): ${live.total.toLocaleString()} records.${live.hits.length ? ` Sample: ${live.hits[0]}` : " No active recall signal."}`,
      recordsScreened: live.total,
      cerComment: tr
        ? `Canlı FDA geri çağırma taraması — ${live.total} kayıt eşleşti.`
        : `Live FDA recall search — ${live.total} matching records.`,
      evidenceUrl: live.apiUrl,
      liveVerified: true,
      liveQueryUrl: live.apiUrl,
      liveRecordCount: live.total,
      sampleHits: live.hits,
    };
  }

  if (registryId === "fda-510k") {
    const live = await searchFda510kLive(productName, purpose, 3);
    const status = live.records.length > 0 ? "review_required" : "no_signal";
    const sample = live.records
      .slice(0, 3)
      .map((r) => `${r.kNumber} ${r.deviceName} (${r.applicant})`);
    return {
      registryId,
      query: live.queryUsed,
      status,
      summary: tr
        ? `Canlı openFDA 510(k): ${live.total.toLocaleString("tr-TR")} kayıt; sorgu \`${live.queryUsed}\`.`
        : `Live openFDA 510(k): ${live.total.toLocaleString()} records; query \`${live.queryUsed}\`.`,
      recordsScreened: live.total,
      cerComment: tr
        ? `Canlı 510(k) taraması — predicate/eşdeğer pazar geçmişi için ${live.records.length} örnek kayıt listelendi.`
        : `Live 510(k) search — ${live.records.length} sample predicate records listed.`,
      evidenceUrl: live.records[0] ? fda510kDetailUrl(live.records[0].kNumber) : live.apiUrl,
      liveVerified: live.live,
      liveQueryUrl: live.apiUrl,
      liveRecordCount: live.total,
      sampleHits: sample,
    };
  }

  const query = `${productName} ${purpose}`.trim();
  return {
    registryId,
    query,
    status: "review_required",
    summary: tr
      ? `${label} için otomatik canlı API yok; portal sorgusu gerekli (${searchDate}). Sorgu: \`${query}\`. Ekran görüntüsü kanıtı ekleyin.`
      : `No live API for ${label}; portal search required (${searchDate}). Query: \`${query}\`. Attach screenshot evidence.`,
    recordsScreened: undefined,
    cerComment: tr
      ? `Manuel ${label} taraması ve kanıt ekran görüntüsü zorunludur.`
      : `Manual ${label} search and screenshot evidence required.`,
    evidenceUrl: portalSearchUrl(registryId, query),
    liveVerified: false,
    liveQueryUrl: portalSearchUrl(registryId, query),
  };
}
