import "server-only";

export interface Fda510kRecord {
  kNumber: string;
  deviceName: string;
  applicant: string;
  decisionDate: string;
  decisionDescription: string;
  productCode: string;
  deviceClass: string;
  clearanceType: string;
  advisoryCommittee?: string;
  statementOrSummary?: string;
}

export interface Fda510kSearchResult {
  records: Fda510kRecord[];
  total: number;
  queryUsed: string;
  apiUrl: string;
  live: boolean;
  error?: string;
}

const OPENFDA_BASE = "https://api.fda.gov/device/510k.json";

const TERM_MAP: Record<string, string> = {
  oftalmik: "ophthalmic",
  ophthalmic: "ophthalmic",
  bıçak: "knife",
  bicak: "knife",
  knife: "knife",
  kesici: "incision",
  incision: "incision",
  steril: "sterile",
  sterile: "sterile",
  kateter: "catheter",
  catheter: "catheter",
  stent: "stent",
  implant: "implant",
  surgical: "surgical",
  cerrahi: "surgical",
  göz: "eye",
  goz: "eye",
  eye: "eye",
  cornea: "cornea",
  kornea: "cornea",
  sklera: "sclera",
  sclera: "sclera",
};

function normalizeKNumber(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (!t) return "";
  return t.startsWith("K") ? t : `K${t}`;
}

export function fda510kDetailUrl(kNumber: string): string {
  const k = normalizeKNumber(kNumber);
  return `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfPMN/pmn.cfm?ID=${encodeURIComponent(k)}`;
}

export function openFdaQueryUrl(search: string, limit = 10): string {
  const url = new URL(OPENFDA_BASE);
  url.searchParams.set("search", search);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("sort", "decision_date:desc");
  return url.toString();
}

function tokenizeForFda(text: string): string[] {
  const lower = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const words = lower.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const mapped = words.map((w) => TERM_MAP[w] ?? w).filter(Boolean);
  return Array.from(new Set(mapped));
}

function buildSearchQueries(productName: string, purpose?: string | null): string[] {
  const tokens = tokenizeForFda(`${productName} ${purpose ?? ""}`);
  const queries: string[] = [];

  if (tokens.includes("ophthalmic") && (tokens.includes("knife") || tokens.includes("incision"))) {
    queries.push("device_name:knife AND device_name:ophthalmic");
    queries.push('device_name:"ophthalmic" AND device_name:incision');
    queries.push('device_name:"ophthalmic" AND device_name:knife');
    queries.push('device_name:"incisional instrument"');
  }
  if (tokens.includes("ophthalmic")) {
    queries.push("device_name:ophthalmic");
  }
  if (tokens.length >= 2) {
    queries.push(`device_name:${tokens[0]} AND device_name:${tokens[1]}`);
  }
  if (tokens.length >= 1) {
    queries.push(`device_name:${tokens[0]}`);
  }
  queries.push(`device_name:"${productName.replace(/"/g, "")}"`);

  return Array.from(new Set(queries));
}

function mapRecord(row: Record<string, unknown>): Fda510kRecord | null {
  const kNumber = typeof row.k_number === "string" ? row.k_number : "";
  const deviceName = typeof row.device_name === "string" ? row.device_name : "";
  if (!kNumber || !deviceName) return null;
  const openfda =
    row.openfda && typeof row.openfda === "object"
      ? (row.openfda as Record<string, unknown>)
      : null;
  const cls =
    (typeof openfda?.device_class === "string" && openfda.device_class) ||
    (typeof row.device_class === "string" && row.device_class) ||
    "";
  return {
    kNumber: normalizeKNumber(kNumber),
    deviceName,
    applicant: typeof row.applicant === "string" ? row.applicant : "—",
    decisionDate: typeof row.decision_date === "string" ? row.decision_date : "",
    decisionDescription:
      typeof row.decision_description === "string" ? row.decision_description : "",
    productCode: typeof row.product_code === "string" ? row.product_code : "",
    deviceClass: cls ? `Class ${cls}` : "—",
    clearanceType: typeof row.clearance_type === "string" ? row.clearance_type : "",
    advisoryCommittee:
      typeof row.advisory_committee_description === "string"
        ? row.advisory_committee_description
        : undefined,
    statementOrSummary:
      typeof row.statement_or_summary === "string" ? row.statement_or_summary : undefined,
  };
}

async function fetchOpenFda(search: string, limit: number): Promise<Fda510kSearchResult> {
  const apiUrl = openFdaQueryUrl(search, limit);
  const url = new URL(apiUrl);
  const apiKey = process.env.OPENFDA_API_KEY?.trim();
  if (apiKey) url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      records: [],
      total: 0,
      queryUsed: search,
      apiUrl,
      live: false,
      error: `openFDA HTTP ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`,
    };
  }

  const json = (await res.json()) as {
    results?: Record<string, unknown>[];
    meta?: { results?: { total?: number } };
  };
  const records = (json.results ?? [])
    .map(mapRecord)
    .filter((r): r is Fda510kRecord => Boolean(r));

  return {
    records,
    total: json.meta?.results?.total ?? records.length,
    queryUsed: search,
    apiUrl,
    live: true,
  };
}

function dedupeRecords(records: Fda510kRecord[]): Fda510kRecord[] {
  const seen = new Set<string>();
  const out: Fda510kRecord[] = [];
  for (const r of records) {
    if (seen.has(r.kNumber)) continue;
    seen.add(r.kNumber);
    out.push(r);
  }
  return out;
}

/** Live FDA 510(k) search via openFDA (free public API). */
export async function searchFda510kLive(
  productName: string,
  purpose?: string | null,
  limit = 6,
): Promise<Fda510kSearchResult> {
  const queries = buildSearchQueries(productName, purpose);
  const collected: Fda510kRecord[] = [];
  let last: Fda510kSearchResult | null = null;

  for (const q of queries) {
    last = await fetchOpenFda(q, Math.min(limit, 25));
    if (last.records.length) {
      collected.push(...last.records);
      if (dedupeRecords(collected).length >= limit) break;
    }
    if (last.error && last.error.includes("429")) break;
  }

  const records = dedupeRecords(collected).slice(0, limit);
  if (records.length > 0 && last) {
    return { ...last, records, total: last.total, queryUsed: last.queryUsed, live: true };
  }

  return (
    last ?? {
      records: [],
      total: 0,
      queryUsed: queries[0] ?? "",
      apiUrl: openFdaQueryUrl(queries[0] ?? "device_name:medical", limit),
      live: false,
      error: "No 510(k) records matched the product profile.",
    }
  );
}
