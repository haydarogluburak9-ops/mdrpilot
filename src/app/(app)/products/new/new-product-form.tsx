"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { Input, Textarea } from "@/components/ui/input";
import { ProductVariantsEditor } from "@/components/modules/product-variants-editor";
import {
  emptyBrand,
  stripVariantsForApi,
  type BrandVariantForm,
} from "@/lib/products/variant-form";

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

export function NewProductForm({ welcome = false }: { welcome?: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestNote, setSuggestNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    deviceClass: "CLASS_I" as (typeof DEVICE_CLASSES)[number],
    intendedPurpose: "",
    userProfile: "",
    patientPopulation: "",
    isInvasive: false,
    hasMeasuringFn: false,
    containsSoftware: false,
    materials: "",
    appliedStandards: "",
  });

  const [variants, setVariants] = useState<BrandVariantForm[]>([emptyBrand()]);

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
      const brands = Array.from(new Set(variants.map((b) => b.brand.trim()).filter(Boolean))).slice(0, 50);
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
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, variants: stripVariantsForApi(variants) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("products.form.error"));
        return;
      }
      router.push(`/products/${data.id}?setup=1&tab=overview`);
      router.refresh();
    } catch {
      setError(t("products.form.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title={t("products.form.title")} description={t("products.form.desc")} />

      {welcome && (
        <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">{t("workflow.welcome.productTitle")}</p>
          <p className="mt-1 text-muted-foreground">{t("workflow.welcome.productDesc")}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("products.form.basics")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={suggest}
              disabled={suggesting || !form.name.trim()}
              title={!form.name.trim() ? t("products.form.suggestNeedsName") : undefined}
            >
              {suggesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {t("products.form.suggest")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {form.name.trim() ? t("products.form.suggestHint") : t("products.form.suggestNeedsName")}
          </p>
          {suggesting && <AiAnalyzingHint />}
          {suggestNote && (
            <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              {suggestNote}
            </p>
          )}

          <div>
            <label className={fieldLabel} htmlFor="name">
              {t("products.form.name")} *
            </label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t("products.form.namePlaceholder")}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("products.form.nameHint")}</p>
          </div>

          <div>
            <label className={fieldLabel} htmlFor="deviceClass">
              {t("products.form.deviceClass")}
            </label>
            <select
              id="deviceClass"
              className={selectClass}
              value={form.deviceClass}
              onChange={(e) =>
                update("deviceClass", e.target.value as (typeof DEVICE_CLASSES)[number])
              }
            >
              {DEVICE_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {t(`deviceClass.${c}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLabel} htmlFor="intendedPurpose">
              {t("products.form.intendedPurpose")}
            </label>
            <Textarea
              id="intendedPurpose"
              value={form.intendedPurpose}
              onChange={(e) => update("intendedPurpose", e.target.value)}
              placeholder={t("products.form.intendedPurposePlaceholder")}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="userProfile">
                {t("products.form.userProfile")}
              </label>
              <Textarea
                id="userProfile"
                value={form.userProfile}
                onChange={(e) => update("userProfile", e.target.value)}
                placeholder={t("products.form.userProfilePlaceholder")}
                rows={2}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="patientPopulation">
                {t("products.form.patientPopulation")}
              </label>
              <Textarea
                id="patientPopulation"
                value={form.patientPopulation}
                onChange={(e) => update("patientPopulation", e.target.value)}
                placeholder={t("products.form.patientPopulationPlaceholder")}
                rows={2}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="materials">
                {t("products.form.materials")}
              </label>
              <Textarea
                id="materials"
                value={form.materials}
                onChange={(e) => update("materials", e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="appliedStandards">
                {t("products.form.appliedStandards")}
              </label>
              <Textarea
                id="appliedStandards"
                value={form.appliedStandards}
                onChange={(e) => update("appliedStandards", e.target.value)}
                placeholder="ISO 14971:2019, ISO 10993-1:2018, …"
                rows={2}
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("products.form.characteristics")}
          </h3>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span>{t("products.form.isInvasive")}</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.isInvasive}
              onChange={(e) => update("isInvasive", e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span>{t("products.form.hasMeasuringFn")}</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.hasMeasuringFn}
              onChange={(e) => update("hasMeasuringFn", e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span>{t("products.form.containsSoftware")}</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.containsSoftware}
              onChange={(e) => update("containsSoftware", e.target.checked)}
            />
          </label>
        </Card>
      </div>

      <div className="mt-6">
        <ProductVariantsEditor variants={variants} onChange={setVariants} />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" className="gap-2" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("products.form.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/products")}
          disabled={saving}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
