import { describe, expect, it } from "vitest";
import {
  buildRegistrySearchUrl,
  isSubscriptionLiteratureDb,
} from "@/lib/integrations/registry-deep-links";
import { DEFAULT_LITERATURE_DATABASE_IDS } from "@/lib/domain/clinical-literature-model";
import { buildClinicalGapMatrix } from "@/lib/domain/clinical-gap-matrix";
import { buildLiteratureDatabaseRows } from "@/lib/domain/clinical-literature-search-rows";
import type { LiteratureSearchData } from "@/lib/domain/clinical-literature-model";

describe("registry deep-links", () => {
  it("builds PubMed and national registry search URLs", () => {
    const pubmed = buildRegistrySearchUrl("pubmed", "ophthalmic blade", ["ophthalmic"]);
    expect(pubmed).toContain("pubmed.ncbi.nlm.nih.gov");
    expect(pubmed).toContain("ophthalmic");

    const mhra = buildRegistrySearchUrl("mhra", "ophthalmic knife");
    expect(mhra).toContain("gov.uk");
    expect(mhra).toContain("ophthalmic");

    const bfarm = buildRegistrySearchUrl("bfarm", "blade");
    expect(bfarm).toContain("bfarm.de");
  });

  it("marks Embase/Cochrane as subscription", () => {
    expect(isSubscriptionLiteratureDb("embase")).toBe(true);
    expect(isSubscriptionLiteratureDb("cochrane")).toBe(true);
    expect(isSubscriptionLiteratureDb("pubmed")).toBe(false);
  });

  it("defaults literature chips to PubMed only", () => {
    expect([...DEFAULT_LITERATURE_DATABASE_IDS]).toEqual(["pubmed"]);
  });
});

describe("literature honesty gap matrix", () => {
  const baseLit = (over: Partial<LiteratureSearchData> = {}): LiteratureSearchData => ({
    population: "p",
    intervention: "i",
    comparator: "c",
    outcomes: "o",
    databases: ["pubmed", "fda-maude"],
    searchQuery: "ophthalmic",
    searchDate: "2026-07-09",
    inclusionCriteria: "",
    exclusionCriteria: "",
    prisma: {
      identified: 10,
      duplicatesRemoved: 1,
      screened: 9,
      excludedScreen: 5,
      fullTextAssessed: 4,
      excludedFullText: 1,
      included: 2,
    },
    notes: "",
    preparedByMedDoc: true,
    liveLiteratureSearch: true,
    evidenceScreenshots: [],
    acceptedArticles: [],
    registryResults: [
      {
        registryId: "fda-maude",
        query: "q",
        status: "no_signal",
        summary: "ok",
        liveVerified: true,
        evidenceUrl: "https://example.com/maude",
        evidenceScreenshots: [],
      },
    ],
    ...over,
  });

  it("flags missing PubMed search screenshot and PDFs", () => {
    const matrix = buildClinicalGapMatrix({
      locale: "en",
      productName: "Blade",
      deviceClass: "IIa",
      isSterile: true,
      usesEquivalence: false,
      literatureData: baseLit(),
    });
    const perf = matrix.rows.find((r) => r.id === "clinical-performance");
    expect(perf?.severity).toBe("major");
    expect(perf?.gapEn.toLowerCase()).toMatch(/screenshot|pdf/);
  });

  it("passes when SS + PDFs + registry SS present", () => {
    const matrix = buildClinicalGapMatrix({
      locale: "en",
      productName: "Blade",
      deviceClass: "IIa",
      isSterile: true,
      usesEquivalence: false,
      literatureData: baseLit({
        evidenceScreenshots: [
          {
            id: "1",
            storageKey: "k",
            fileName: "a.png",
            mimeType: "image/png",
            uploadedAt: "2026-07-09",
          },
        ],
        acceptedArticles: [
          {
            id: "a1",
            storageKey: "p1",
            fileName: "1.pdf",
            mimeType: "application/pdf",
            uploadedAt: "2026-07-09",
            studyIndex: 1,
          },
          {
            id: "a2",
            storageKey: "p2",
            fileName: "2.pdf",
            mimeType: "application/pdf",
            uploadedAt: "2026-07-09",
            studyIndex: 2,
          },
        ],
        registryResults: [
          {
            registryId: "fda-maude",
            query: "q",
            status: "no_signal",
            summary: "ok",
            liveVerified: true,
            evidenceUrl: "https://example.com/maude",
            evidenceScreenshots: [
              {
                id: "r1",
                storageKey: "rk",
                fileName: "r.png",
                mimeType: "image/png",
                uploadedAt: "2026-07-09",
              },
            ],
          },
        ],
      }),
    });
    expect(matrix.rows.find((r) => r.id === "clinical-performance")?.severity).toBe("none");
    expect(matrix.rows.find((r) => r.id === "safety-vigilance")?.severity).toBe("none");
  });
});

describe("literature database rows honesty", () => {
  it("adds deep-link for subscription DBs", () => {
    const data: LiteratureSearchData = {
      population: "",
      intervention: "",
      comparator: "",
      outcomes: "",
      databases: ["pubmed", "embase"],
      searchQuery: "ophthalmic blade",
      searchKeywords: ["ophthalmic"],
      searchDate: "2026-07-09",
      inclusionCriteria: "",
      exclusionCriteria: "",
      prisma: {
        identified: 0,
        duplicatesRemoved: 0,
        screened: 0,
        excludedScreen: 0,
        fullTextAssessed: 0,
        excludedFullText: 0,
        included: 0,
      },
      notes: "",
      preparedByMedDoc: true,
      liveLiteratureSearch: true,
      pubmedQueryUrl: "https://pubmed.ncbi.nlm.nih.gov/?term=ophthalmic",
      pubmedTotal: 12,
    };
    const rows = buildLiteratureDatabaseRows(data, "en");
    const embase = rows.find((r) => r.databaseId === "embase");
    expect(embase?.subscription).toBe(true);
    expect(embase?.queryUrl).toContain("embase.com");
    expect(embase?.status).toBe("manual_required");
  });
});
