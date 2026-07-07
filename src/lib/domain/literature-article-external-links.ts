/** Client-safe external URLs to locate / download article PDFs (legal sources). */

export interface LiteratureArticleExternalLinks {
  pubmed: string;
  europePmcArticle: string;
  europePmcPdf: string;
  doiPublisher?: string;
  unpaywall?: string;
}

export function externalLinksForPmid(pmid: string, doi?: string | null): LiteratureArticleExternalLinks {
  const id = pmid.replace(/\D/g, "");
  const normalizedDoi = doi?.trim().replace(/^doi:\s*/i, "") || undefined;
  return {
    pubmed: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    europePmcArticle: `https://europepmc.org/article/MED/${id}`,
    europePmcPdf: `https://www.ebi.ac.uk/europepmc/webservices/rest/MED/${id}/fullTextPDF`,
    doiPublisher: normalizedDoi ? `https://doi.org/${normalizedDoi}` : undefined,
    unpaywall: normalizedDoi
      ? `https://unpaywall.org/articles/${encodeURIComponent(normalizedDoi)}`
      : undefined,
  };
}
