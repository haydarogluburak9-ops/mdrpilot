/**
 * Honest deep-links for clinical literature / vigilance portals.
 * Prefills a search query where the public site accepts URL params;
 * otherwise returns the portal homepage (user still searches manually).
 */
import { registryEvidenceUrl } from "@/lib/domain/clinical-cer-premium";

function encodeQ(q: string): string {
  return encodeURIComponent(q.trim().slice(0, 200));
}

/** Build a human-facing search URL for a catalog database / registry id. */
export function buildRegistrySearchUrl(
  registryId: string,
  query: string,
  keywords: string[] = [],
): string {
  const q = (query.trim() || keywords.filter(Boolean).join(" ")).trim();
  const term = encodeQ(q || "medical device");
  const base = registryEvidenceUrl(registryId);

  switch (registryId) {
    case "pubmed":
      return `https://pubmed.ncbi.nlm.nih.gov/?term=${term}`;
    case "cochrane":
      return `https://www.cochranelibrary.com/search?q=${term}`;
    case "embase":
      // Subscription UI — deep-link is best-effort homepage + query hint in fragment
      return q ? `https://www.embase.com/#search/results?query=${term}` : base || "https://www.embase.com/";
    case "sciencedirect":
      return `https://www.sciencedirect.com/search?qs=${term}`;
    case "scopus":
      return `https://www.scopus.com/results/results.uri?query=${term}`;
    case "trdizin":
      return `https://search.trdizin.gov.tr/tr/yayin/ara?q=${term}`;
    case "fda-maude":
      return base || "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfMAUDE/search.CFM";
    case "fda-recalls":
      return base || "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfRES/res.cfm";
    case "fda-510k":
      return base || "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfPMN/pmn.cfm";
    case "bfarm":
      // BfArM site search
      return `https://www.bfarm.de/SiteGlobals/Forms/Suche/Expertensuche_Formular.html?nn=469210&cl2Categories_Themen=medizinprodukte&searchEngineQueryString=${term}`;
    case "mhra":
      return `https://www.gov.uk/search/all?keywords=${term}&order=relevance`;
    case "eudamed":
      return base || "https://ec.europa.eu/tools/eudamed/";
    case "ansm":
      return `https://ansm.sante.fr/?s=${term}`;
    case "aemps":
      return base || "https://www.aemps.gob.es/";
    case "swissmedic":
      return `https://www.swissmedic.ch/swissmedic/en/home/search.html#?q=${term}`;
    case "health-canada":
      return `https://recalls-rappels.canada.ca/en/search/site?search_api_fulltext=${term}`;
    case "tga":
      return `https://www.tga.gov.au/resources/resource-hub?keywords=${term}`;
    case "pmda":
      return base || "https://www.pmda.go.jp/english/";
    case "titck":
      return base || "https://www.titck.gov.tr/";
    default:
      return base || (q ? `https://www.google.com/search?q=${term}` : "");
  }
}

/** Literature DBs that require subscription / manual import (no free live API in MDRpilot). */
export const SUBSCRIPTION_LITERATURE_IDS = new Set([
  "embase",
  "cochrane",
  "scopus",
  "sciencedirect",
]);

export function isSubscriptionLiteratureDb(id: string): boolean {
  return SUBSCRIPTION_LITERATURE_IDS.has(id);
}
