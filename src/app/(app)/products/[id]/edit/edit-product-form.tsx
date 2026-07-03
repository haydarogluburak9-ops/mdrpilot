"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { Input, Textarea } from "@/components/ui/input";
import { ProductVariantsEditor } from "@/components/modules/product-variants-editor";
import { stripVariantsForApi, variantsFromProduct, type BrandVariantForm } from "@/lib/products/variant-form";
import type { Product } from "@/lib/domain/types";

const DEVICE_CLASSES = [
  "CLASS_I",
  "CLASS_IS",
  "CLASS_IM",
  "CLASS_IR",
  "CLASS_IIA",
  "CLASS_IIB",
  "CLASS_III",
] as const;

const fieldLabel = "mb-1.5 block text-sm font-medium";
const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EditProductForm({ product: p }: { product: Product }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestNote, setSuggestNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: p.name ?? "",
    deviceClass: (p.deviceClass ?? "CLASS_I") as (typeof DEVICE_CLASSES)[number],
    basicUdiDi: p.basicUdiDi ?? "",
    udiDi: p.udiDi ?? "",
    emdnCode: p.emdnCode ?? "",
    intendedPurpose: p.intendedPurpose ?? "",
    userProfile: p.userProfile ?? "",
    patientPopulation: p.patientPopulation ?? "",
    indications: p.indications ?? "",
    contraindications: p.contraindications ?? "",
    bodyContactDuration: p.bodyContactDuration ?? "",
    materials: p.materials ?? "",
    packagingType: p.packagingType ?? "",
    shelfLife: p.shelfLife ?? "",
    manufacturingProcess: p.manufacturingProcess ?? "",
    criticalSuppliers: p.criticalSuppliers ?? "",
    appliedStandards: p.appliedStandards ?? "",
    isInvasive: p.isInvasive ?? false,
    hasMeasuringFn: p.hasMeasuringFn ?? false,
    containsSoftware: p.containsSoftware ?? false,
    isImplantable: p.isImplantable ?? false,
    isActive: p.isActive ?? false,
    isReusable: p.isReusable ?? false,
    emitsRadiation: p.emitsRadiation ?? false,
    administersMedicineOrEnergy: p.administersMedicineOrEnergy ?? false,
    containsMedicinalSubstance: p.containsMedicinalSubstance ?? false,
    containsBiologicalMaterial: p.containsBiologicalMaterial ?? false,
    isAbsorbable: p.isAbsorbable ?? false,
    containsCmrOrEndocrine: p.containsCmrOrEndocrine ?? false,
    containsNanomaterial: p.containsNanomaterial ?? false,
    isForLayUser: p.isForLayUser ?? false,
  });

  const [variants, setVariants] = useState<BrandVariantForm[]>(() => variantsFromProduct(p));

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function suggest() {
    if (!form.name.trim()) {
      setError(t("products.form.suggestNeedsName"));
      return;
    }
    setSuggesting(true);
    setError(null);
    setSuggestNote(null);
    try {
      const brands = Array.from(
        new Set(variants.map((b) => b.brand.trim()).filter(Boolean)),
      ).slice(0, 50);
      const models = Array.from(
        new Set(variants.flatMap((b) => b.models.map((m) => m.name.trim()).filter(Boolean))),
      ).slice(0, 100);
      const sterilizations = Array.from(
        new Set(variants.flatMap((b) => b.models.flatMap((m) => m.sterilizations))),
      );
      const res = await fetch("/api/products/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          deviceClass: form.deviceClass,
          isInvasive: form.isInvasive,
          hasMeasuringFn: form.hasMeasuringFn,
          containsSoftware: form.containsSoftware,
          brands,
          models,
          sterilizations,
          lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("products.form.suggestError"));
        return;
      }
      const s = data.suggestion ?? {};
      setForm((f) => ({
        ...f,
        intendedPurpose: s.intendedPurpose || f.intendedPurpose,
        userProfile: s.userProfile || f.userProfile,
        patientPopulation: s.patientPopulation || f.patientPopulation,
        indications: s.indications || f.indications,
        contraindications: s.contraindications || f.contraindications,
        materials: s.materials || f.materials,
        appliedStandards: s.appliedStandards || f.appliedStandards,
      }));
      setSuggestNote(
        s.source === "ai" ? t("products.form.suggestDoneAi") : t("products.form.suggestDoneFallback"),
      );
    } catch {
      setError(t("products.form.suggestError"));
    } finally {
      setSuggesting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t("products.form.nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, variants: stripVariantsForApi(variants) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("products.edit.error"));
        return;
      }
      router.push(`/products/${p.id}`);
      router.refresh();
    } catch {
      setError(t("products.edit.error"));
    } finally {
      setSaving(false);
    }
  }

  const textField = (key: keyof typeof form, labelKey: string, rows = 2) => (
    <div>
      <label className={fieldLabel} htmlFor={key}>
        {t(labelKey)}
      </label>
      <Textarea
        id={key}
        value={form[key] as string}
        onChange={(e) => update(key, e.target.value as never)}
        rows={rows}
      />
    </div>
  );

  const check = (key: keyof typeof form, labelKey: string) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{t(labelKey)}</span>
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={form[key] as boolean}
        onChange={(e) => update(key, e.target.checked as never)}
      />
    </label>
  );

  return (
    <form onSubmit={submit}>
      <PageHeader title={`${t("products.edit.title")}: ${p.name}`} description={t("products.edit.desc")} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity — user-entered */}
        <Card className="space-y-4 p-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">{t("products.edit.identity")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("products.edit.identityHint")}</p>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="name">
              {t("products.form.name")} *
            </label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="basicUdiDi">
              {t("pd.field.basicUdiDi")}
            </label>
            <Input
              id="basicUdiDi"
              value={form.basicUdiDi}
              onChange={(e) => update("basicUdiDi", e.target.value)}
              placeholder="e.g. 0123456789012A"
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="udiDi">
              {t("pd.field.udiDi")}
            </label>
            <Input
              id="udiDi"
              value={form.udiDi}
              onChange={(e) => update("udiDi", e.target.value)}
              placeholder="e.g. (01)01234567890128"
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="emdnCode">
              {t("pd.field.emdnCode")}
            </label>
            <Input
              id="emdnCode"
              value={form.emdnCode}
              onChange={(e) => update("emdnCode", e.target.value)}
              placeholder="e.g. Q020199"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("pd.field.emdnCode.help")}</p>
          </div>
          <div>
            <label className={fieldLabel}>{t("pd.field.productPhoto")}</label>
            <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-4">
              {p.photoKey ? (
                <img
                  src={`/api/products/${p.id}/photo?v=${photoVersion}`}
                  alt={t("pd.field.productPhoto")}
                  className="max-h-28 max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">{t("pd.field.productPhoto.empty")}</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-input bg-card px-3 py-2 text-sm hover:bg-muted">
                {t("pd.field.productPhoto.upload")}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  disabled={photoBusy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPhotoBusy(true);
                    setPhotoError(null);
                    try {
                      const fd = new FormData();
                      fd.append("file", file);
                      const res = await fetch(`/api/products/${p.id}/photo`, { method: "POST", body: fd });
                      const data = await res.json();
                      if (!res.ok) {
                        setPhotoError(data.error ?? t("pd.field.productPhoto.failed"));
                        return;
                      }
                      setPhotoVersion((v) => v + 1);
                      router.refresh();
                    } catch {
                      setPhotoError(t("pd.field.productPhoto.failed"));
                    } finally {
                      setPhotoBusy(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              {p.photoKey && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:text-destructive"
                  disabled={photoBusy}
                  onClick={async () => {
                    setPhotoBusy(true);
                    setPhotoError(null);
                    try {
                      const res = await fetch(`/api/products/${p.id}/photo`, { method: "DELETE" });
                      if (!res.ok) {
                        const data = await res.json();
                        setPhotoError(data.error ?? t("pd.field.productPhoto.failed"));
                        return;
                      }
                      setPhotoVersion((v) => v + 1);
                      router.refresh();
                    } catch {
                      setPhotoError(t("pd.field.productPhoto.failed"));
                    } finally {
                      setPhotoBusy(false);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" /> {t("pd.field.productPhoto.remove")}
                </button>
              )}
            </div>
            {photoError && <p className="mt-1 text-xs text-destructive">{photoError}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{t("pd.field.productPhoto.hint")}</p>
          </div>
        </Card>

        {/* Classification */}
        <Card className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("products.edit.classification")}</h3>
          <div>
            <label className={fieldLabel} htmlFor="deviceClass">
              {t("products.form.deviceClass")}
            </label>
            <select
              id="deviceClass"
              className={selectClass}
              value={form.deviceClass}
              onChange={(e) => update("deviceClass", e.target.value as (typeof DEVICE_CLASSES)[number])}
            >
              {DEVICE_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {t(`deviceClass.${c}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="bodyContactDuration">
              {t("pd.field.bodyContactDuration")}
            </label>
            <Input
              id="bodyContactDuration"
              value={form.bodyContactDuration}
              onChange={(e) => update("bodyContactDuration", e.target.value)}
              placeholder={t("products.edit.bodyContactPlaceholder")}
            />
          </div>
          <div className="space-y-2 pt-1">
            {check("isInvasive", "products.form.isInvasive")}
            {check("hasMeasuringFn", "products.form.hasMeasuringFn")}
            {check("containsSoftware", "products.form.containsSoftware")}
          </div>
          <p className="text-xs text-muted-foreground">{t("products.edit.sterilizationNote")}</p>
        </Card>

        {/* Manufacturing / supply */}
        <Card className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("products.edit.manufacturing")}</h3>
          <div>
            <label className={fieldLabel} htmlFor="packagingType">
              {t("pd.field.packaging")}
            </label>
            <Input
              id="packagingType"
              value={form.packagingType}
              onChange={(e) => update("packagingType", e.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="shelfLife">
              {t("pd.field.shelfLife")}
            </label>
            <Input id="shelfLife" value={form.shelfLife} onChange={(e) => update("shelfLife", e.target.value)} />
          </div>
          {textField("manufacturingProcess", "pd.field.manufacturingProcess")}
          {textField("criticalSuppliers", "pd.field.criticalSuppliers")}
        </Card>
      </div>

      <div className="mt-6">
        <ProductVariantsEditor variants={variants} onChange={setVariants} />
      </div>

      {/* Device characteristics — drive section / GSPR applicability */}
      <Card className="mt-6 space-y-4 p-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">{t("products.edit.characteristics")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("products.edit.characteristicsHint")}</p>
        </div>
        <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {check("isImplantable", "products.form.isImplantable")}
          {check("isActive", "products.form.isActive")}
          {check("isReusable", "products.form.isReusable")}
          {check("administersMedicineOrEnergy", "products.form.administersMedicineOrEnergy")}
          {check("emitsRadiation", "products.form.emitsRadiation")}
          {check("containsMedicinalSubstance", "products.form.containsMedicinalSubstance")}
          {check("containsBiologicalMaterial", "products.form.containsBiologicalMaterial")}
          {check("isAbsorbable", "products.form.isAbsorbable")}
          {check("containsCmrOrEndocrine", "products.form.containsCmrOrEndocrine")}
          {check("containsNanomaterial", "products.form.containsNanomaterial")}
          {check("isForLayUser", "products.form.isForLayUser")}
        </div>
      </Card>

      {/* Descriptive — AI assisted */}
      <Card className="mt-6 space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">{t("products.edit.descriptive")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("products.form.suggestHint")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={suggest}
            disabled={suggesting || !form.name.trim()}
          >
            {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {t("products.form.suggest")}
          </Button>
        </div>
        {suggesting && <AiAnalyzingHint />}
        {suggestNote && (
          <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            {suggestNote}
          </p>
        )}

        {textField("intendedPurpose", "pd.field.intendedPurpose", 3)}
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("userProfile", "pd.field.userProfile")}
          {textField("patientPopulation", "pd.field.patientPopulation")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("indications", "pd.field.indications")}
          {textField("contraindications", "pd.field.contraindications")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("materials", "pd.field.materials")}
          {textField("appliedStandards", "pd.field.appliedStandards")}
        </div>
      </Card>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" className="gap-2" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("products.edit.save")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/products/${p.id}`)} disabled={saving}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
