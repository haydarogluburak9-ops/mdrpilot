import "server-only";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const EUROPE_PMC_PDF = "https://www.ebi.ac.uk/europepmc/webservices/rest/MED";
const FETCH_TIMEOUT_MS = 25_000;
const USER_AGENT = "MDRpilot/1.0 (clinical evaluation literature sync)";

function apiKeyParam(): string {
  const key = process.env.NCBI_API_KEY?.trim();
  return key ? `&api_key=${encodeURIComponent(key)}` : "";
}

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length > 100 && buf.slice(0, 5).toString() === "%PDF-";
}

async function fetchPdfUrl(url: string): Promise<Buffer | null> {
  const res = await fetch(url, {
    headers: { Accept: "application/pdf", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return isPdfBuffer(buf) ? buf : null;
}

async function fetchEuropePmcPdf(pmid: string): Promise<Buffer | null> {
  return fetchPdfUrl(`${EUROPE_PMC_PDF}/${pmid}/fullTextPDF`);
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
  return fetchPdfUrl(`https://pmc.ncbi.nlm.nih.gov/articles/PMC${pmcId}/pdf/`);
}

/** Best-effort open-access full text (Europe PMC, then NCBI PMC). Paywalled articles return null. */
export async function fetchOpenAccessPdfForPmid(pmid: string): Promise<Buffer | null> {
  const normalized = pmid.replace(/\D/g, "");
  if (!normalized) return null;

  const europe = await fetchEuropePmcPdf(normalized);
  if (europe) return europe;

  return fetchNcbiPmcPdf(normalized);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
