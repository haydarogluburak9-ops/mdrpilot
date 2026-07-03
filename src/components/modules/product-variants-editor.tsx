"use client";

import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeModelSterilizations } from "@/lib/domain/sterilization";
import {
  STERILIZATION_METHODS,
  type BrandVariantForm,
  type SterMethod,
  emptyBrand,
  emptyModel,
  parseModelCodes,
  variantCounts,
} from "@/lib/products/variant-form";

const fieldLabel = "mb-1.5 block text-sm font-medium";

export function ProductVariantsEditor({
  variants,
  onChange,
}: {
  variants: BrandVariantForm[];
  onChange: (next: BrandVariantForm[]) => void;
}) {
  const { t } = useI18n();
  const { brandCount, modelCount } = variantCounts(variants);

  function mutate(fn: (draft: BrandVariantForm[]) => void) {
    const next = variants.map((b) => ({
      ...b,
      bulkSters: [...b.bulkSters],
      models: b.models.map((m) => ({ ...m, sterilizations: [...m.sterilizations] })),
    }));
    fn(next);
    onChange(next);
  }

  const addBrand = () => mutate((d) => d.push(emptyBrand()));
  const removeBrand = (bi: number) => mutate((d) => d.splice(bi, 1));
  const setBrandName = (bi: number, name: string) => mutate((d) => { d[bi].brand = name; });
  const addModel = (bi: number) => mutate((d) => d[bi].models.push(emptyModel()));
  const removeModel = (bi: number, mi: number) => mutate((d) => d[bi].models.splice(mi, 1));
  const setModelName = (bi: number, mi: number, name: string) =>
    mutate((d) => { d[bi].models[mi].name = name; });
  const toggleSter = (bi: number, mi: number, method: SterMethod) =>
    mutate((d) => {
      const set = new Set(d[bi].models[mi].sterilizations);
      if (set.has(method)) set.delete(method);
      else set.add(method);
      d[bi].models[mi].sterilizations = Array.from(set);
    });
  const setBulkText = (bi: number, text: string) => mutate((d) => { d[bi].bulkText = text; });
  const toggleBulkSter = (bi: number, method: SterMethod) =>
    mutate((d) => {
      const set = new Set(d[bi].bulkSters);
      if (set.has(method)) set.delete(method);
      else set.add(method);
      d[bi].bulkSters = Array.from(set);
    });
  const applyBulk = (bi: number) =>
    mutate((d) => {
      const brand = d[bi];
      const codes = parseModelCodes(brand.bulkText);
      if (codes.length === 0) return;
      const existingNames = new Set(brand.models.map((m) => m.name.trim()).filter(Boolean));
      const additions = codes
        .filter((code) => !existingNames.has(code))
        .map((code) => ({
          name: code,
          sterilizations: normalizeModelSterilizations(code, [...brand.bulkSters]) as SterMethod[],
        }));
      brand.models = [...brand.models.filter((m) => m.name.trim()), ...additions];
      brand.bulkText = "";
    });

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">{t("products.form.variants")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("products.form.variantsHint")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {brandCount} {t("products.form.brands")} · {modelCount} {t("products.form.models")}
        </span>
      </div>

      <div className="space-y-4">
        {variants.map((b, bi) => (
          <div key={bi} className="rounded-lg border border-border p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className={fieldLabel}>{t("products.form.brand")}</label>
                <Input
                  value={b.brand}
                  onChange={(e) => setBrandName(bi, e.target.value)}
                  placeholder={t("products.form.brandPlaceholder")}
                />
              </div>
              {variants.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBrand(bi)}
                  aria-label={t("products.form.removeBrand")}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>

            <div className="mt-3 space-y-3 border-l-2 border-muted pl-4">
              {b.models.map((m, mi) => (
                <div key={mi} className="rounded-md bg-muted/40 p-3">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className={fieldLabel}>{t("products.form.model")}</label>
                      <Input
                        value={m.name}
                        onChange={(e) => setModelName(bi, mi, e.target.value)}
                        placeholder={t("products.form.modelPlaceholder")}
                      />
                    </div>
                    {b.models.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeModel(bi, mi)}
                        aria-label={t("products.form.removeModel")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="mt-2">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {t("products.form.sterilizations")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {STERILIZATION_METHODS.map((method) => {
                        const active = m.sterilizations.includes(method);
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => toggleSter(bi, mi, method)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs transition-colors",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:bg-muted",
                            )}
                          >
                            {t(`sterilization.${method}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => addModel(bi)}>
                <Plus className="h-3.5 w-3.5" /> {t("products.form.addModel")}
              </Button>

              <div className="rounded-md border border-dashed border-border p-3">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t("products.form.bulkAdd")}
                </span>
                <Textarea
                  value={b.bulkText}
                  onChange={(e) => setBulkText(bi, e.target.value)}
                  placeholder={"YM-240\nYM-240-R\nYM-250"}
                  rows={3}
                  className="font-mono text-xs"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("products.form.bulkSterHint")}</span>
                  {STERILIZATION_METHODS.map((method) => {
                    const active = b.bulkSters.includes(method);
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => toggleBulkSter(bi, method)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:bg-muted",
                        )}
                      >
                        {t(`sterilization.${method}`)}
                      </button>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2 gap-1"
                  onClick={() => applyBulk(bi)}
                  disabled={parseModelCodes(b.bulkText).length === 0}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("products.form.bulkApply")}
                  {parseModelCodes(b.bulkText).length > 0 ? ` (${parseModelCodes(b.bulkText).length})` : ""}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" className="gap-2" onClick={addBrand}>
        <Plus className="h-4 w-4" /> {t("products.form.addBrand")}
      </Button>
    </Card>
  );
}
