"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { groupLabelModelsByBrand, flattenLabelModels } from "@/lib/domain/label-models";
import type { CompanyLabelProfile } from "@/lib/domain/label-data";
import type { Product } from "@/lib/domain/types";
import { LabelPreviewForModel } from "./label-preview-for-model";

const PAGE_SIZE = 12;

const STER_LIST_LABEL: Record<string, string> = {
  EO: "EO",
  GAMMA: "R",
  STEAM: "Buhar",
  OTHER: "Diğer",
};

function sterilizationListLabel(methods: string[]): string {
  return methods.map((m) => STER_LIST_LABEL[m] ?? m).join(", ");
}

export function LabelPreviewPanel({
  product,
  company,
  selectedIds,
  onSelectedIdsChange,
  selectionMode = false,
}: {
  product: Product;
  company: CompanyLabelProfile;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  selectionMode?: boolean;
}) {
  const { t } = useI18n();
  const allModels = useMemo(
    () => flattenLabelModels(product.variants, product.brand, product.model),
    [product.variants, product.brand, product.model],
  );
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [previewId, setPreviewId] = useState(allModels[0]?.id ?? "");

  useEffect(() => {
    setPreviewId(allModels[0]?.id ?? "");
    setPage(0);
  }, [product.id, allModels]);

  const brands = useMemo(() => Array.from(groupLabelModelsByBrand(allModels).keys()), [allModels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allModels.filter((m) => {
      if (brandFilter && m.brand !== brandFilter) return false;
      if (!q) return true;
      return m.displayRef.toLowerCase().includes(q) || m.modelName.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q);
    });
  }, [allModels, search, brandFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageModels = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const previewModel = allModels.find((m) => m.id === previewId) ?? filtered[0] ?? allModels[0];

  const selected = selectedIds ?? [];
  const toggle = (id: string) => {
    if (!onSelectedIdsChange) return;
    onSelectedIdsChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={t("ifu.modelSearch")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Badge variant="muted">{allModels.length} model</Badge>
      </div>

      {brands.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={brandFilter === null ? "default" : "outline"}
            onClick={() => {
              setBrandFilter(null);
              setPage(0);
            }}
          >
            {t("common.all")}
          </Button>
          {brands.map((b) => (
            <Button
              key={b}
              type="button"
              size="sm"
              variant={brandFilter === b ? "default" : "outline"}
              onClick={() => {
                setBrandFilter(b);
                setPage(0);
              }}
            >
              {b}
            </Button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border">
        <div className="max-h-48 overflow-y-auto divide-y divide-border">
          {pageModels.map((m) => {
            const isPreview = previewId === m.id;
            const isChecked = selected.includes(m.id);
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-muted/40 ${
                  isPreview ? "border-l-2 border-l-primary bg-primary/10" : "border-l-2 border-l-transparent"
                } ${isChecked ? "bg-muted/20" : ""}`}
                onClick={() => setPreviewId(m.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPreviewId(m.id);
                  }
                }}
              >
                {selectionMode && onSelectedIdsChange && (
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 shrink-0 rounded border-border"
                    checked={isChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(m.id)}
                  />
                )}
                <div className="min-w-0 flex-1 text-left">
                  <span className="font-medium">{m.displayRef}</span>
                  {m.sterilizations.length > 0 && (
                    <span className="ml-2 text-muted-foreground">{sterilizationListLabel(m.sterilizations)}</span>
                  )}
                </div>
              </div>
            );
          })}
          {pageModels.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("common.none")}</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <Button type="button" size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("ifu.modelListPage").replace("{page}", String(page + 1)).replace("{total}", String(totalPages))}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {previewModel && (
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("ifu.modelPreview")}</p>
          <LabelPreviewForModel product={product} company={company} model={previewModel} />
        </div>
      )}
    </div>
  );
}
