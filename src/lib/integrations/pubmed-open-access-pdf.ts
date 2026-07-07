import "server-only";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const EUROPE_PMC_PDF = "https://www.ebi.ac.uk/europepmc/webservices/rest/MED";
const EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
const FETCH_TIMEOUT_MS = 25_000;
const USER_AGENT = "MDRpilot/1.0 (clinical evaluation literature sync)";

function apiKeyParam(): string {
  const key = process.env.NCBI_API_KEY?.trim();
  return key ? `&api_key=${encodeURIComponent(key)}` : "";
}

function unpaywallEmail(): string {
  return process.env.UNPAYWALL_EMAIL?.trim() || "contact@mdrpilot.com";
}

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length > 100 && buf.slice(0, 5).toString() === "%PDF-";
}

async function fetchPdfUrl(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/pdf", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (isPdfBuffer(buf)) return buf;
    if (contentType.includes("pdf") && buf.length > 500) return buf;
    return null;
  } catch {
    return null;
  }
}

async function fetchEuropePmcPdf(pmid: string): Promise<Buffer | null> {
  const direct = await fetchPdfUrl(`${EUROPE_PMC_PDF}/${pmid}/fullTextPDF`);
  if (direct) return direct;

  try {
    const searchUrl = `${EUROPE_PMC_SEARCH}?query=EXT_ID:${pmid}&format=json&resultType=core&pageSize=1`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      resultList?: {
        result?: Array<{
          hasPDF?: string;
          pmcid?: string;
          fullTextUrlList?: { fullTextUrl?: Array<{ url?: string; documentStyle?: string }> };
        }>;
      };
    };
    const hit = json.resultList?.result?.[0];
    if (!hit) return null;

    const urls = hit.fullTextUrlList?.fullTextUrl ?? [];
    for (const entry of urls) {
      if (entry.url && (entry.documentStyle === "pdf" || entry.url.endsWith(".pdf"))) {
        const buf = await fetchPdfUrl(entry.url);
        if (buf) return buf;
      }
    }

    if (hit.pmcid) {
      const pmcid = hit.pmcid.replace(/^PMC/i, "");
      const buf = await fetchPdfUrl(`https://pmc.ncbi.nlm.nih.gov/articles/PMC${pmcid}/pdf/`);
      if (buf) return buf;
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchDoiForPmid(pmid: string): Promise<string | null> {
  try {
    const url = `${EUTILS}/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json${apiKeyParam()}`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: Record<
        string,
        {
          elocationid?: string;
          articleids?: Array<{ idtype?: string; value?: string }>;
        }
      >;
    };
    const row = json.result?.[pmid];
    if (!row) return null;

    const fromIds = row.articleids?.find((a) => a.idtype?.toLowerCase() === "doi")?.value;
    if (fromIds) return fromIds.replace(/^doi:\s*/i, "");

    const eloc = row.elocationid?.trim();
    if (eloc?.toLowerCase().startsWith("doi:")) {
      return eloc.replace(/^doi:\s*/i, "");
    }
    if (eloc?.includes("10.")) return eloc;
    return null;
  } catch {
    return null;
  }
}

async function fetchUnpaywallPdf(doi: string): Promise<Buffer | null> {
  try {
    const apiUrl = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(unpaywallEmail())}`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      best_oa_location?: { url_for_pdf?: string; url?: string };
    };
    const pdfUrl = json.best_oa_location?.url_for_pdf || json.best_oa_location?.url;
    if (!pdfUrl) return null;
    return fetchPdfUrl(pdfUrl);
  } catch {
    return null;
  }
}

async function pmcIdForPmid(pmid: string): Promise<string | null> {
  const url = `${EUTILS}/elink.fcgi?dbfrom=pubmed&db=pmc&id=${pmid}&retmode=json${apiKeyParam()}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    linksets?: Array<{
      linksetdbs?: Array<{ dbto?: string; links?: string[] }>;
    }>;
  };

  for (const linkset of json.linksets ?? []) {
    for (const db of linkset.linksetdbs ?? []) {
      if (db.dbto === "pmc" && db.links?.[0]) return db.links[0];
    }
  }
  return null;
}

async function fetchNcbiPmcPdf(pmid: string): Promise<Buffer | null> {
  const pmcId = await pmcIdForPmid(pmid);
  if (!pmcId) return null;
  const buf = await fetchPdfUrl(`https://pmc.ncbi.nlm.nih.gov/articles/PMC${pmcId}/pdf/`);
  if (buf) return buf;
  return fetchPdfUrl(`https://pmc.ncbi.nlm.nih.gov/articles/PMC${pmcId}/pdf/main.pdf`);
}

/** Best-effort open-access full text (Europe PMC, NCBI PMC, Unpaywall). Paywalled articles return null. */
export async function fetchOpenAccessPdfForPmid(pmid: string): Promise<Buffer | null> {
  const normalized = pmid.replace(/\D/g, "");
  if (!normalized) return null;

  const europe = await fetchEuropePmcPdf(normalized);
  if (europe) return europe;

  const ncbi = await fetchNcbiPmcPdf(normalized);
  if (ncbi) return ncbi;

  const doi = await fetchDoiForPmid(normalized);
  if (doi) {
    const unpaywall = await fetchUnpaywallPdf(doi);
    if (unpaywall) return unpaywall;
  }

  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
