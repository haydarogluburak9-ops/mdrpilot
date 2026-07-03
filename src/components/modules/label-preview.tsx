"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import type { LabelDisplayData, CompanyLabelProfile, LabelSymbolSlot } from "@/lib/domain/label-data";
import { buildLabelDisplayData } from "@/lib/domain/label-data";
import type { Product } from "@/lib/domain/types";

function SymbolBadge({
  symbol,
  size = "md",
}: {
  symbol: LabelSymbolSlot;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-7 w-7 text-[7px]" : "h-9 w-9 text-[8px]";
  const img = size === "sm" ? "max-h-5 max-w-5" : "max-h-6 max-w-6";
  return (
    <div
      className={`flex shrink-0 ${box} flex-col items-center justify-center rounded border border-border bg-muted/40 font-bold`}
      title={symbol.title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={symbol.imagePath}
        alt={symbol.title}
        className={`${img} object-contain`}
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          const parent = el.parentElement;
          if (parent && !parent.dataset.fallback) {
            parent.dataset.fallback = "1";
            parent.textContent = symbol.fallback;
          }
        }}
      />
    </div>
  );
}

function FieldRow({ symbol, label, value }: { symbol: LabelSymbolSlot; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <SymbolBadge symbol={symbol} size="sm" />
      <div className="min-w-0">
        <span className="text-muted-foreground">{label} </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

export function LabelPreview({
  product,
  company,
  label: labelProp,
}: {
  product?: Product;
  company?: CompanyLabelProfile;
  label?: LabelDisplayData;
}) {
  const { t, lang } = useI18n();
  const label = useMemo(() => {
    if (labelProp) return labelProp;
    if (product && company) return buildLabelDisplayData(product, company, lang);
    return null;
  }, [labelProp, product, company, lang]);

  if (!label) return null;

  const fs = label.fieldSymbols;

  return (
    <div className="mx-auto w-full max-w-[380px] rounded-lg border-2 border-dashed border-border p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-bold leading-tight">{label.productName}</p>
        <div className="flex shrink-0 items-center gap-1">
          <SymbolBadge symbol={fs.ce} size="sm" />
          {label.notifiedBodyNumber && (
            <span className="whitespace-nowrap text-[9px] font-bold leading-none">{label.notifiedBodyNumber}</span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-start gap-3">
        <div className="flex min-w-0 flex-col gap-1.5 pt-0.5">
          <FieldRow symbol={fs.ref} label="REF" value={label.ref} />
          <FieldRow symbol={fs.lot} label="LOT" value={label.lot} />
          <div className="flex items-center gap-1 pt-0.5">
            <Badge variant="muted" className="shrink-0 whitespace-nowrap text-[10px]">
              {t("ifu.singleUse")}
            </Badge>
            <Badge variant="warning" className="shrink-0 whitespace-nowrap text-[10px]">
              {t("ifu.doNotReuse")}
            </Badge>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 flex-col gap-1.5">
          <FieldRow symbol={fs.udi} label="UDI" value={label.udi} />
          <FieldRow symbol={fs.exp} label="EXP" value={label.exp} />
        </div>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        {t("ifu.shelfLife")}: {label.shelfLifeText}
      </p>

      {fs.sterilization && label.sterilizationBadge && (
        <div className="mt-2 flex items-center gap-1.5">
          <SymbolBadge symbol={fs.sterilization} size="sm" />
          <Badge variant="default" className="shrink-0 whitespace-nowrap text-[10px]">
            STERILE {label.sterilizationBadge}
          </Badge>
        </div>
      )}

      {label.auxiliarySymbols.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {label.auxiliarySymbols.map((s) => (
            <SymbolBadge key={s.clause} symbol={s} size="sm" />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-start gap-1.5 border-t border-border/60 pt-2">
        <SymbolBadge symbol={fs.manufacturer} size="sm" />
        <div className="min-w-0 text-[9px] leading-snug text-muted-foreground">
          <p className="font-medium text-foreground">{label.manufacturer}</p>
          {label.manufacturerAddress ? (
            <p className="mt-0.5 break-words">{label.manufacturerAddress}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-muted-foreground">{t("ifu.refPerModel")}</p>
      <p className="text-[10px] text-muted-foreground">{t("ifu.seeIfu")}</p>
    </div>
  );
}
