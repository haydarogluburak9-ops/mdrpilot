"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Loader2, Save, Sparkles, ArrowRight, Wand2, X, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  buildSearchQueryFromPico,
  buildLiteratureSearchKeywords,
  CLINICAL_DATABASE_CATALOG,
  databaseLabel,
  defaultPicoOutcomes,
  emptyLiteratureSearchData,
  type LiteratureSearchData,
  type RegistrySearchResult,
} from "@/lib/domain/clinical-literature-model";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";
import {
  IncludedStudiesTable,
  LiteratureDatabaseTable,
  RegistryResultsTable,
} from "@/components/clinical/clinical-literature-search-tables";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground">{children}</label>;
}

export function ClinicalLiteratureWizard({
  productId,
  productName,
  productIndications,
  initial,
  canEdit,
  onSaved,
  onGoToFindings,
}: {
  productId: string;
  productName: string;
  productIndications?: string | null;
  initial?: LiteratureSearchData | null;
  canEdit: boolean;
  onSaved: (evaluation: ClinicalEvaluationData) => void;
  onGoToFindings?: () => void;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "tr" ? "tr" : "en";
  const [data, setData] = useState<LiteratureSearchData>(() => {
    if (initial) return initial;
    const empty = emptyLiteratureSearchData(productName, locale);
    const outcomes = productIndications?.trim() || empty.outcomes || defaultPicoOutcomes(locale);
    return { ...empty, outcomes };
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [syncingArticles, setSyncingArticles] = useState(false);
  const [uploadingStudyIndex, setUploadingStudyIndex] = useState<number | null>(null);
  const [fetchingPdfStudyIndex, setFetchingPdfStudyIndex] = useState<number | null>(null);
  const [articleSyncFeedback, setArticleSyncFeedback] = useState<string | null>(null);
  const [fillingPico, setFillingPico] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const picoAutoFilled = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [showStrategy, setShowStrategy] = useState(true);

  const suggestedQuery = useMemo(() => buildSearchQueryFromPico(data), [data]);
  const previewKeywords = useMemo(() => {
    if (data.searchKeywords?.length) return data.searchKeywords;
    return buildLiteratureSearchKeywords({
      productName: data.intervention,
      indications: data.outcomes,
      intendedPurpose: data.population,
    });
  }, [data.searchKeywords, data.intervention, data.outcomes, data.population]);
  const hasResults =
    Boolean(data.preparedByMedDoc) ||
    Boolean(data.literatureSummary?.trim()) ||
    (data.registryResults?.length ?? 0) > 0 ||
    (data.includedStudies?.length ?? 0) > 0;

  function setPrisma<K extends keyof LiteratureSearchData["prisma"]>(key: K, value: number) {
    setData((d) => ({ ...d, prisma: { ...d.prisma, [key]: value } }));
  }

  function toggleDatabase(dbId: string) {
    setData((d) => {
      const has = d.databases.includes(dbId);
      return {
        ...d,
        databases: has ? d.databases.filter((x) => x !== dbId) : [...d.databases, dbId],
      };
    });
  }

  const literatureDbs = CLINICAL_DATABASE_CATALOG.filter((d) => d.group === "literature");
  const regulatoryDbs = CLINICAL_DATABASE_CATALOG.filter((d) => d.group === "regulatory");

  function DatabaseChips({ ids }: { ids: typeof CLINICAL_DATABASE_CATALOG }) {
    return (
      <div className="flex flex-wrap gap-2">
        {ids.map((db) => (
          <button
            key={db.id}
            type="button"
            onClick={() => toggleDatabase(db.id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              data.databases.includes(db.id)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
            title={db.region}
          >
            {databaseLabel(db.id, locale)}
          </button>
        ))}
      </div>
    );
  }

  function applyPicoSuggestion(
    pico: Pick<LiteratureSearchData, "population" | "intervention" | "comparator" | "outcomes">,
    onlyEmpty = true,
  ) {
    setData((d) => ({
      ...d,
      population: onlyEmpty && d.population?.trim() ? d.population : pico.population,
      intervention: onlyEmpty && d.intervention?.trim() ? d.intervention : pico.intervention,
      comparator: onlyEmpty && d.comparator?.trim() ? d.comparator : pico.comparator,
      outcomes:
        onlyEmpty && d.outcomes?.trim() && d.outcomes !== defaultPicoOutcomes(locale)
          ? d.outcomes
          : pico.outcomes,
    }));
  }

  async function fillPicoFromProfile(onlyEmpty = true) {
    setFillingPico(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/literature/pico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.lit.picoFillError"));
        return;
      }
      if (body.pico) applyPicoSuggestion(body.pico, onlyEmpty);
    } catch {
      setError(t("clinical.lit.picoFillError"));
    } finally {
      setFillingPico(false);
    }
  }

  useEffect(() => {
    if (!canEdit || picoAutoFilled.current) return;
    const needsPico = !data.population?.trim() || !data.comparator?.trim();
    if (!needsPico) return;
    picoAutoFilled.current = true;
    void fillPicoFromProfile(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount when PICO incomplete
  }, []);

  function applySuggestedQuery() {
    setData((d) => ({ ...d, searchQuery: suggestedQuery }));
  }

  function formatArticleSyncFeedback(sync: {
    fetched?: number;
    alreadyPresent?: number;
    unavailable?: number;
    attempted?: number;
  } | null | undefined): string | null {
    if (!sync) return null;
    const fetched = sync.fetched ?? 0;
    const already = sync.alreadyPresent ?? 0;
    const unavailable = sync.unavailable ?? 0;
    const attempted = sync.attempted ?? fetched + unavailable;
    if (fetched === 0 && unavailable === 0 && already === 0) return null;
    if (fetched === 0 && unavailable > 0 && attempted > 0) {
      return t("clinical.lit.articleSyncNoneOpenAccess").replace("{unavailable}", String(unavailable));
    }
    return t("clinical.lit.articleSyncDone")
      .replace("{fetched}", String(fetched))
      .replace("{unavailable}", String(unavailable))
      .replace("{already}", String(already));
  }

  async function runMedDocSearch() {
    setGenerating(true);
    setError(null);
    setArticleSyncFeedback(null);
    try {
      const res = await fetch(
        `/api/products/${productId}/clinical-evaluation/literature/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, syncFindings: true }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.lit.generateError"));
        return;
      }
      if (body.evaluation?.literatureData) {
        setData(body.evaluation.literatureData);
        onSaved(body.evaluation);
        setArticleSyncFeedback(formatArticleSyncFeedback(body.articleSync));
      }
    } catch {
      setError(t("clinical.lit.generateError"));
    } finally {
      setGenerating(false);
    }
  }

  async function resetLiteratureSearch() {
    if (!window.confirm(t("clinical.lit.resetSearchConfirm"))) return;
    setResetting(true);
    setError(null);
    setResetFeedback(null);
    setArticleSyncFeedback(null);
    try {
      const res = await fetch(
        `/api/products/${productId}/clinical-evaluation/literature/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.lit.resetSearchError"));
        return;
      }
      if (body.evaluation?.literatureData) {
        setData(body.evaluation.literatureData);
        onSaved(body.evaluation);
        setShowStrategy(true);
        picoAutoFilled.current = true;
        setResetFeedback(t("clinical.lit.resetSearchDone"));
      }
    } catch {
      setError(t("clinical.lit.resetSearchError"));
    } finally {
      setResetting(false);
    }
  }

  async function syncOpenAccessArticles() {
    setSyncingArticles(true);
    setError(null);
    setArticleSyncFeedback(null);
    try {
      const res = await fetch(
        `/api/products/${productId}/clinical-evaluation/literature/articles/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.lit.articleSyncError"));
        return;
      }
      if (body.evaluation?.literatureData) {
        setData(body.evaluation.literatureData);
        onSaved(body.evaluation);
      }
      setArticleSyncFeedback(formatArticleSyncFeedback(body.articleSync));
    } catch {
      setError(t("clinical.lit.articleSyncError"));
    } finally {
      setSyncingArticles(false);
    }
  }

  async function fetchPdfForStudy(studyIndex: number) {
    setFetchingPdfStudyIndex(studyIndex);
    setError(null);
    try {
      const res = await fetch(
        `/api/products/${productId}/clinical-evaluation/literature/articles/fetch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studyIndex, locale }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.lit.articleSyncError"));
        return;
      }
      if (body.evaluation?.literatureData) {
        setData(body.evaluation.literatureData);
        onSaved(body.evaluation);
      }
      if (body.fetched) {
        setArticleSyncFeedback(t("clinical.lit.articleFetchDone"));
      } else if (body.unavailable) {
        setArticleSyncFeedback(t("clinical.lit.articleFetchUnavailable"));
      }
    } catch {
      setError(t("clinical.lit.articleSyncError"));
    } finally {
      setFetchingPdfStudyIndex(null);
    }
  }

  async function persistLiteratureData(next: LiteratureSearchData) {
    const res = await fetch(`/api/products/${productId}/clinical-evaluation/literature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        literatureData: {
          ...next,
          searchQuery: next.searchQuery.trim() || suggestedQuery,
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof body.error === "string" ? body.error : t("clinical.lit.saveError"));
    }
    if (body.evaluation?.literatureData) {
      setData(body.evaluation.literatureData);
      onSaved(body.evaluation);
    }
    return body.evaluation as ClinicalEvaluationData | undefined;
  }

  async function uploadArticle(file: File, options?: { citation?: string; studyIndex?: number }) {
    const studyIndex = options?.studyIndex;
    if (studyIndex != null) setUploadingStudyIndex(studyIndex);
    else setUploadingTarget("article");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (options?.citation) form.append("citation", options.citation);
      if (studyIndex != null) form.append("studyIndex", String(studyIndex));
      const res = await fetch(
        `/api/products/${productId}/clinical-evaluation/literature/articles`,
        { method: "POST", body: form },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.lit.articleUploadError"));
        return;
      }
      if (!body.article) return;
      const next: LiteratureSearchData = {
        ...data,
        acceptedArticles: [...(data.acceptedArticles ?? []).filter(
          (a) => a.studyIndex !== studyIndex,
        ), body.article],
      };
      setData(next);
      await persistLiteratureData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clinical.lit.articleUploadError"));
    } finally {
      if (studyIndex != null) setUploadingStudyIndex(null);
      else setUploadingTarget(null);
    }
  }

  async function removeArticle(id: string) {
    const next: LiteratureSearchData = {
      ...data,
      acceptedArticles: (data.acceptedArticles ?? []).filter((a) => a.id !== id),
    };
    setData(next);
    try {
      await persistLiteratureData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clinical.lit.saveError"));
    }
  }

  async function uploadEvidence(target: string, file: File, registryId?: string) {
    setUploadingTarget(target);
    setError(null);
    try {
      const form = new FormData();
      form.append("target", target);
      form.append("file", file);
      const res = await fetch(
        `/api/products/${productId}/clinical-evaluation/literature/evidence`,
        { method: "POST", body: form },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.lit.evidenceUploadError"));
        return;
      }
      if (!body.screenshot) return;
      if (registryId) {
        setData((d) => ({
          ...d,
          registryResults: (d.registryResults ?? []).map((row) =>
            row.registryId === registryId
              ? {
                  ...row,
                  evidenceScreenshots: [...(row.evidenceScreenshots ?? []), body.screenshot],
                }
              : row,
          ),
        }));
      } else {
        setData((d) => ({
          ...d,
          evidenceScreenshots: [...(d.evidenceScreenshots ?? []), body.screenshot],
        }));
      }
    } catch {
      setError(t("clinical.lit.evidenceUploadError"));
    } finally {
      setUploadingTarget(null);
    }
  }

  function removeEvidence(target: string, screenshotId: string, registryId?: string) {
    if (registryId) {
      setData((d) => ({
        ...d,
        registryResults: (d.registryResults ?? []).map((row) =>
          row.registryId === registryId
            ? {
                ...row,
                evidenceScreenshots: (row.evidenceScreenshots ?? []).filter((s) => s.id !== screenshotId),
              }
            : row,
        ),
      }));
    } else {
      setData((d) => ({
        ...d,
        evidenceScreenshots: (d.evidenceScreenshots ?? []).filter((s) => s.id !== screenshotId),
      }));
    }
  }

  function evidenceImageUrl(target: string, storageKey: string) {
    return `/api/products/${productId}/clinical-evaluation/literature/evidence?target=${encodeURIComponent(target)}&key=${encodeURIComponent(storageKey)}`;
  }

  function EvidenceScreenshots({
    target,
    registryId,
    shots,
  }: {
    target: string;
    registryId?: string;
    shots: NonNullable<LiteratureSearchData["evidenceScreenshots"]>;
  }) {
    if (!canEdit && shots.length === 0) return null;
    return (
      <div className="space-y-1">
        {canEdit && (
          <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-primary underline">
            {uploadingTarget === target ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ImagePlus className="h-3 w-3" />
            )}
            {t("clinical.lit.addScreenshot")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploadingTarget !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadEvidence(target, file, registryId);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {shots.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {shots.map((ss) => (
              <div key={ss.id} className="relative">
                <img
                  src={evidenceImageUrl(target, ss.storageKey)}
                  alt={ss.caption ?? ss.fileName}
                  className="h-14 w-20 rounded border border-border object-cover"
                />
                {canEdit && (
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    onClick={() => removeEvidence(target, ss.id, registryId)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function registryEvidenceCell(row: RegistrySearchResult) {
    return (
      <>
        {row.liveQueryUrl ? (
          <a
            href={row.liveQueryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline break-all block"
          >
            {t("clinical.lit.openLiveQuery")}
          </a>
        ) : row.evidenceUrl ? (
          <a
            href={row.evidenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline break-all block"
          >
            {t("clinical.lit.registryCol.openRegistry")}
          </a>
        ) : null}
        <EvidenceScreenshots
          target={row.registryId}
          registryId={row.registryId}
          shots={row.evidenceScreenshots ?? []}
        />
      </>
    );
  }

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await persistLiteratureData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("clinical.lit.saveError"));
    } finally {
      setLoading(false);
    }
  }

  if (!canEdit) {
    if (!hasResults) {
      return (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {initial?.searchQuery?.trim() ? data.searchQuery : t("clinical.emptySection")}
        </p>
      );
    }
    return (
      <div className="space-y-4">
        {data.literatureSummary?.trim() && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="mb-2 text-sm font-semibold">{t("clinical.lit.literatureSummary")}</h4>
            <p className="text-sm text-muted-foreground">{data.literatureSummary}</p>
          </div>
        )}
        {(data.includedStudies?.length ?? 0) > 0 || data.databases.some((id) => id === "pubmed") ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t("clinical.lit.literatureDbResultsTitle")}</h4>
            <LiteratureDatabaseTable data={data} productId={productId} />
          </div>
        ) : null}
        {(data.includedStudies?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t("clinical.lit.includedStudiesTableTitle")}</h4>
            <IncludedStudiesTable data={data} productId={productId} canEdit={false} />
          </div>
        )}
        {(data.registryResults?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t("clinical.lit.registryResultsTitle")}</h4>
            <RegistryResultsTable rows={data.registryResults ?? []} locale={locale} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-sm font-medium">{t("clinical.lit.meddocTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("clinical.lit.meddocHint")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={generating || resetting}
            onClick={runMedDocSearch}
            className="gap-1.5"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? t("clinical.lit.generating") : t("clinical.lit.runMedDoc")}
          </Button>
          {hasResults && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={generating || resetting}
              onClick={() => void resetLiteratureSearch()}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("clinical.lit.resetSearch")}
            </Button>
          )}
          {onGoToFindings && hasResults && (
            <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={onGoToFindings}>
              {t("clinical.lit.goToFindings")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        {resetFeedback && (
          <p className="mt-2 text-xs text-muted-foreground">{resetFeedback}</p>
        )}
      </div>

      <p className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100">
        {t("clinical.lit.resultsHint")}
      </p>

      {hasResults && (
        <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">{t("clinical.lit.resultsTitle")}</h4>
            <div className="flex flex-wrap items-center gap-2">
              {data.liveLiteratureSearch && data.pubmedTotal != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
                  {t("clinical.lit.livePubmedBadge").replace("{n}", String(data.pubmedTotal))}
                </span>
              )}
              {data.pubmedQueryUrl && (
                <a
                  href={data.pubmedQueryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary underline"
                >
                  {t("clinical.lit.openPubmedQuery")}
                </a>
              )}
              {data.preparedAt && (
                <span className="text-xs text-muted-foreground">
                  {t("clinical.lit.preparedAt")}: {new Date(data.preparedAt).toLocaleString(locale)}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("clinical.lit.meddocDisclaimer")}</p>

          {data.literatureSummary?.trim() && (
            <div className="space-y-1">
              <FieldLabel>{t("clinical.lit.literatureSummary")}</FieldLabel>
              <p className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                {data.literatureSummary}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["identified", t("clinical.lit.prisma.identified")],
                ["screened", t("clinical.lit.prisma.screened")],
                ["fullTextAssessed", t("clinical.lit.prisma.fullText")],
                ["included", t("clinical.lit.prisma.included")],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="rounded-md border border-border bg-card px-2 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold">{data.prisma[key]}</p>
              </div>
            ))}
          </div>
          {data.prisma.included > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("clinical.lit.includedStudiesHint").replace("{n}", String(data.prisma.included))}
            </p>
          )}

          <div className="space-y-2">
            <FieldLabel>{t("clinical.lit.literatureDbResultsTitle")}</FieldLabel>
            <LiteratureDatabaseTable data={data} productId={productId} />
          </div>

          {(data.includedStudies?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLabel>{t("clinical.lit.includedStudiesTableTitle")}</FieldLabel>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={syncingArticles || generating}
                    onClick={() => void syncOpenAccessArticles()}
                    className="gap-1.5 text-xs h-8"
                  >
                    {syncingArticles ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    {t("clinical.lit.fetchOpenAccessPdfs")}
                  </Button>
                )}
              </div>
              {articleSyncFeedback && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">{articleSyncFeedback}</p>
              )}
              <IncludedStudiesTable
                data={data}
                productId={productId}
                canEdit={canEdit}
                uploadingStudyIndex={uploadingStudyIndex}
                fetchingPdfStudyIndex={fetchingPdfStudyIndex}
                onUploadForStudy={(studyIndex, file) => {
                  const study = data.includedStudies?.find((s) => s.index === studyIndex);
                  void uploadArticle(file, { studyIndex, citation: study?.citation });
                }}
                onFetchPdfForStudy={(studyIndex) => void fetchPdfForStudy(studyIndex)}
              />
            </div>
          )}

          {(data.registryResults?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <FieldLabel>{t("clinical.lit.registryResultsTitle")}</FieldLabel>
              <RegistryResultsTable
                rows={data.registryResults ?? []}
                locale={locale}
                evidenceSlot={registryEvidenceCell}
              />
              <p className="text-[10px] text-muted-foreground">{t("clinical.lit.statusFootnotes")}</p>
            </div>
          )}

          <div className="space-y-1">
            <FieldLabel>{t("clinical.lit.evidenceScreenshots")}</FieldLabel>
            <p className="text-[11px] text-muted-foreground">{t("clinical.lit.evidenceScreenshotsHint")}</p>
            <EvidenceScreenshots target="pubmed" shots={data.evidenceScreenshots ?? []} />
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={() => setShowStrategy((v) => !v)}
      >
        {showStrategy ? t("clinical.lit.hideStrategy") : t("clinical.lit.showStrategy")}
      </Button>

      {showStrategy && (
        <>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{t("clinical.lit.picoTitle")}</h4>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={fillingPico || generating}
                  onClick={() => void fillPicoFromProfile(false)}
                  className="gap-1.5 text-xs h-8"
                >
                  {fillingPico ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  {t("clinical.lit.fillPicoFromProfile")}
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel>{t("clinical.lit.population")}</FieldLabel>
                <textarea
                  value={data.population}
                  onChange={(e) => setData({ ...data, population: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <FieldLabel>{t("clinical.lit.intervention")}</FieldLabel>
                <Input
                  value={data.intervention}
                  onChange={(e) => setData({ ...data, intervention: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel>{t("clinical.lit.comparator")}</FieldLabel>
                <Input
                  value={data.comparator}
                  onChange={(e) => setData({ ...data, comparator: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel>{t("clinical.lit.outcomes")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("clinical.lit.outcomesHelp")}</p>
                <textarea
                  value={data.outcomes}
                  onChange={(e) => setData({ ...data, outcomes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <FieldLabel>{t("clinical.lit.databasesLiterature")}</FieldLabel>
              <DatabaseChips ids={literatureDbs} />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t("clinical.lit.databasesRegulatory")}</FieldLabel>
              <p className="text-xs text-muted-foreground">{t("clinical.lit.databasesRegulatoryHint")}</p>
              <DatabaseChips ids={regulatoryDbs} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>{t("clinical.lit.searchDate")}</FieldLabel>
              <Input
                type="date"
                value={data.searchDate}
                onChange={(e) => setData({ ...data, searchDate: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>{t("clinical.lit.searchQuery")}</FieldLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 h-7 text-xs"
                  onClick={applySuggestedQuery}
                >
                  <Wand2 className="h-3 w-3" />
                  {t("clinical.lit.suggestQuery")}
                </Button>
              </div>
              <textarea
                value={data.searchQuery}
                onChange={(e) => setData({ ...data, searchQuery: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs"
                placeholder={suggestedQuery}
              />
              {previewKeywords.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {t("clinical.lit.searchKeywordsHint")}: {previewKeywords.join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>{t("clinical.lit.inclusion")}</FieldLabel>
              <textarea
                value={data.inclusionCriteria}
                onChange={(e) => setData({ ...data, inclusionCriteria: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("clinical.lit.exclusion")}</FieldLabel>
              <textarea
                value={data.exclusionCriteria}
                onChange={(e) => setData({ ...data, exclusionCriteria: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h4 className="mb-3 text-sm font-semibold">{t("clinical.lit.prismaTitle")}</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["identified", t("clinical.lit.prisma.identified")],
                  ["duplicatesRemoved", t("clinical.lit.prisma.duplicates")],
                  ["screened", t("clinical.lit.prisma.screened")],
                  ["excludedScreen", t("clinical.lit.prisma.excludedScreen")],
                  ["fullTextAssessed", t("clinical.lit.prisma.fullText")],
                  ["excludedFullText", t("clinical.lit.prisma.excludedFullText")],
                  ["included", t("clinical.lit.prisma.included")],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <FieldLabel>{label}</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={data.prisma[key]}
                    onChange={(e) => setPrisma(key, Number(e.target.value) || 0)}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" disabled={loading} onClick={save} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("clinical.lit.save")}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
