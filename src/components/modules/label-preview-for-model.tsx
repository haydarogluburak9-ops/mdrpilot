"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { buildLabelDisplayDataForModel, type CompanyLabelProfile } from "@/lib/domain/label-data";
import { flattenLabelModels, type LabelModelEntry } from "@/lib/domain/label-models";
import type { Product } from "@/lib/domain/types";
import { LabelPreview } from "./label-preview";

export function LabelPreviewForModel({
  product,
  company,
  model,
}: {
  product: Product;
  company: CompanyLabelProfile;
  model: LabelModelEntry;
}) {
  const { lang } = useI18n();
  const label = useMemo(
    () => buildLabelDisplayDataForModel(product, company, lang, model),
    [product, company, lang, model],
  );
  return <LabelPreview label={label} />;
}
