"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  emptyEquivalentDevice,
  emptyEquivalentDevicesData,
  type EquivalencePillarRating,
  type EquivalentDeviceRecord,
  type EquivalentDevicesData,
} from "@/lib/domain/clinical-equivalent-model";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground">{children}</label>;
}

const PILLAR_OPTIONS: EquivalencePillarRating[] = ["equivalent", "similar", "different", "unknown"];

function pillarLabel(p: EquivalencePillarRating, tr: boolean): string {
  if (tr) {
    if (p === "equivalent") return "Eşdeğer";
    if (p === "similar") return "Benzer";
    if (p === "different") return "Farklı";
    return "Değerlendirilecek";
  }
  if (p === "equivalent") return "Equivalent";
  if (p === "similar") return "Similar";
  if (p === "different") return "Different";
  return "To be assessed";
}

export function ClinicalEquivalentPanel({
  productId,
  productName,
  initial,
  canEdit,
  onSaved,
}: {
  productId: string;
  productName: string;
  initial?: EquivalentDevicesData | null;
  canEdit: boolean;
  onSaved: (evaluation: ClinicalEvaluationData) => void;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "tr" ? "tr" : "en";
  const tr = locale === "tr";

  const [data, setData] = useState<EquivalentDevicesData>(
    () => initial ?? emptyEquivalentDevicesData(productName),
  );
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadingId, setUploadingId] = useState<string | null>(null);

  function updateDevice(id: string, patch: Partial<EquivalentDeviceRecord>) {
    setData((d) => ({
      ...d,
      devices: d.devices.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  function addDevice() {
    setData((d) => ({ ...d, devices: [...d.devices, emptyEquivalentDevice()] }));
  }

  function removeDevice(id: string) {
    setData((d) => ({ ...d, devices: d.devices.filter((row) => row.id !== id) }));
  }

  async function runGenerate(merge: boolean) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/equivalents/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, merge }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.equiv.generateError"));
        return;
      }
      if (body.evaluation?.equivalentDevicesData) {
        setData(body.evaluation.equivalentDevicesData);
        onSaved(body.evaluation);
      }
    } catch {
      setError(t("clinical.equiv.generateError"));
    } finally {
      setGenerating(false);
    }
  }

  async function uploadEvidence(deviceId: string, file: File) {
    setUploadingId(deviceId);
    setError(null);
    try {
      const form = new FormData();
      form.append("deviceId", deviceId);
      form.append("file", file);
      const res = await fetch(
        `/api/products/${productId}/clinical-evaluation/equivalents/evidence`,
        { method: "POST", body: form },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.equiv.evidenceUploadError"));
        return;
      }
      if (body.screenshot) {
        setData((d) => ({
          ...d,
          devices: d.devices.map((row) =>
            row.id === deviceId
              ? {
                  ...row,
                  evidenceScreenshots: [...(row.evidenceScreenshots ?? []), body.screenshot],
                }
              : row,
          ),
        }));
      }
    } catch {
      setError(t("clinical.equiv.evidenceUploadError"));
    } finally {
      setUploadingId(null);
    }
  }

  function removeEvidence(deviceId: string, screenshotId: string) {
    setData((d) => ({
      ...d,
      devices: d.devices.map((row) =>
        row.id === deviceId
          ? {
              ...row,
              evidenceScreenshots: (row.evidenceScreenshots ?? []).filter((s) => s.id !== screenshotId),
            }
          : row,
      ),
    }));
  }

  function evidenceImageUrl(deviceId: string, storageKey: string) {
    return `/api/products/${productId}/clinical-evaluation/equivalents/evidence?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(storageKey)}`;
  }

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/equivalents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, data }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.equiv.saveError"));
        return;
      }
      if (body.evaluation) onSaved(body.evaluation);
    } catch {
      setError(t("clinical.equiv.saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("clinical.equiv.hint")}</p>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="accent"
            disabled={generating || loading}
            onClick={() => runGenerate(false)}
            className="gap-1.5"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("clinical.equiv.runMedDoc")}
          </Button>
          {data.devices.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={generating || loading}
              onClick={() => runGenerate(true)}
            >
              {t("clinical.equiv.refreshPrepared")}
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={data.equivalenceClaimed}
            onChange={(e) => setData((d) => ({ ...d, equivalenceClaimed: e.target.checked }))}
          />
          {t("clinical.equiv.claimLabel")}
        </label>
        <div className="space-y-1">
          <FieldLabel>{t("clinical.lit.searchDate")}</FieldLabel>
          <Input
            disabled={!canEdit}
            value={data.searchDate}
            onChange={(e) => setData((d) => ({ ...d, searchDate: e.target.value }))}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <FieldLabel>{t("clinical.lit.searchQuery")}</FieldLabel>
          <Input
            disabled={!canEdit}
            value={data.searchQuery}
            onChange={(e) => setData((d) => ({ ...d, searchQuery: e.target.value }))}
          />
        </div>
      </div>

      {data.summary?.trim() && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          {data.summary}
          {data.liveSearchTotal != null && data.liveSearchTotal > 0 && (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {t("clinical.equiv.liveSearchBadge").replace("{n}", String(data.liveSearchTotal))}
            </p>
          )}
        </div>
      )}

      {data.devices.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("clinical.equiv.empty")}</p>
      )}

      {data.devices.map((d, idx) => (
        <div key={d.id} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {t("clinical.equiv.deviceRow").replace("{n}", String(idx + 1))}
              {d.liveVerified && (
                <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {t("clinical.equiv.liveVerified")}
                </span>
              )}
            </span>
            {canEdit && (
              <Button type="button" size="sm" variant="ghost" onClick={() => removeDevice(d.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>{t("clinical.equiv.deviceName")}</FieldLabel>
              <Input disabled={!canEdit} value={d.deviceName} onChange={(e) => updateDevice(d.id, { deviceName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("clinical.equiv.manufacturer")}</FieldLabel>
              <Input disabled={!canEdit} value={d.manufacturer} onChange={(e) => updateDevice(d.id, { manufacturer: e.target.value })} />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("clinical.equiv.model")}</FieldLabel>
              <Input disabled={!canEdit} value={d.model} onChange={(e) => updateDevice(d.id, { model: e.target.value })} />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("clinical.equiv.regulatoryRef")}</FieldLabel>
              <Input disabled={!canEdit} value={d.regulatoryRef} onChange={(e) => updateDevice(d.id, { regulatoryRef: e.target.value })} />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("clinical.equiv.deviceClass")}</FieldLabel>
              <Input disabled={!canEdit} value={d.deviceClass} onChange={(e) => updateDevice(d.id, { deviceClass: e.target.value })} />
            </div>
            <div className="space-y-1">
              <FieldLabel>{t("clinical.equiv.dataSource")}</FieldLabel>
              <Input disabled={!canEdit} value={d.dataSource} onChange={(e) => updateDevice(d.id, { dataSource: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <FieldLabel>{t("clinical.equiv.intendedUse")}</FieldLabel>
              <textarea
                disabled={!canEdit}
                value={d.intendedUse}
                onChange={(e) => updateDevice(d.id, { intendedUse: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              />
            </div>
            {(["clinical", "technical", "biological"] as const).map((pillar) => {
              const pillarKey = `${pillar}Pillar` as const;
              const notesKey = `${pillar}Notes` as const;
              const label =
                pillar === "clinical"
                  ? t("clinical.equiv.pillarClinical")
                  : pillar === "technical"
                    ? t("clinical.equiv.pillarTechnical")
                    : t("clinical.equiv.pillarBiological");
              return (
                <div key={pillar} className="space-y-1 sm:col-span-2 rounded-md border border-dashed border-border p-3">
                  <FieldLabel>{label}</FieldLabel>
                  <select
                    disabled={!canEdit}
                    value={d[pillarKey]}
                    onChange={(e) =>
                      updateDevice(d.id, { [pillarKey]: e.target.value as EquivalencePillarRating })
                    }
                    className="mb-2 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  >
                    {PILLAR_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {pillarLabel(p, tr)}
                      </option>
                    ))}
                  </select>
                  <textarea
                    disabled={!canEdit}
                    value={d[notesKey]}
                    onChange={(e) => updateDevice(d.id, { [notesKey]: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                    placeholder={t("clinical.equiv.pillarNotesPlaceholder")}
                  />
                </div>
              );
            })}
            <div className="space-y-2 sm:col-span-2 rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold text-muted-foreground">{t("clinical.equiv.tableFieldsTitle")}</p>
              <p className="text-[11px] text-muted-foreground">{t("clinical.equiv.tableFieldsHint")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["dimensions", "clinical.equiv.dimensions"],
                    ["rawMaterial", "clinical.equiv.rawMaterial"],
                    ["biocompatibility", "clinical.equiv.biocompatibility"],
                    ["sterilizationMethod", "clinical.equiv.sterilizationMethod"],
                    ["shelfLife", "clinical.equiv.shelfLife"],
                    ["contactDuration", "clinical.equiv.contactDuration"],
                  ] as const
                ).map(([key, labelKey]) => (
                  <div key={key} className={`space-y-1 ${key === "biocompatibility" ? "sm:col-span-2" : ""}`}>
                    <FieldLabel>{t(labelKey)}</FieldLabel>
                    {key === "biocompatibility" ? (
                      <textarea
                        disabled={!canEdit}
                        value={d[key] ?? ""}
                        onChange={(e) => updateDevice(d.id, { [key]: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                      />
                    ) : (
                      <Input
                        disabled={!canEdit}
                        value={d[key] ?? ""}
                        onChange={(e) => updateDevice(d.id, { [key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {d.cerComment && (
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel>{t("clinical.studies.cerComment")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{d.cerComment}</p>
              </div>
            )}
            {d.evidenceUrl && (
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel>{t("clinical.studies.evidenceUrl")}</FieldLabel>
                <a href={d.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline break-all">
                  {d.fdaKNumber ? `FDA ${d.fdaKNumber}` : d.evidenceUrl}
                </a>
              </div>
            )}
            <div className="space-y-2 sm:col-span-2 rounded-md border border-dashed border-border p-3">
              <FieldLabel>{t("clinical.equiv.evidenceScreenshots")}</FieldLabel>
              <p className="text-[11px] text-muted-foreground">{t("clinical.equiv.evidenceScreenshotsHint")}</p>
              {(d.evidenceScreenshots?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-3">
                  {d.evidenceScreenshots!.map((ss) => (
                    <div key={ss.id} className="relative rounded border border-border bg-card p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={evidenceImageUrl(d.id, ss.storageKey)}
                        alt={ss.caption || ss.fileName}
                        className="h-24 w-auto max-w-[160px] rounded object-contain"
                      />
                      <p className="mt-1 max-w-[160px] truncate text-[10px] text-muted-foreground">
                        {ss.caption || ss.fileName}
                      </p>
                      {canEdit && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="absolute right-0 top-0 h-6 w-6 p-0"
                          onClick={() => removeEvidence(d.id, ss.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canEdit && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-primary">
                  {uploadingId === d.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {t("clinical.equiv.addScreenshot")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploadingId === d.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadEvidence(d.id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      ))}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addDevice} className="gap-1">
            <Plus className="h-4 w-4" />
            {t("clinical.equiv.add")}
          </Button>
          <Button size="sm" disabled={loading} onClick={save} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("clinical.equiv.save")}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
