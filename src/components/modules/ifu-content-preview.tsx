"use client";

import { useI18n } from "@/components/providers/i18n-provider";

export interface IfuPreviewContent {
  intendedPurpose?: string;
  indications?: string;
  contraindications?: string;
  warnings?: string[];
  precautions?: string[];
  instructions?: string;
  storage?: string;
  sterilityInfo?: string;
  disposal?: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-4">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function IfuContentPreview({ content }: { content: IfuPreviewContent }) {
  const { t } = useI18n();
  const warnings = content.warnings?.filter(Boolean) ?? [];
  const precautions = content.precautions?.filter(Boolean) ?? [];

  const hasContent =
    content.intendedPurpose ||
    content.indications ||
    content.contraindications ||
    warnings.length ||
    precautions.length ||
    content.instructions ||
    content.storage ||
    content.sterilityInfo ||
    content.disposal;

  if (!hasContent) {
    return (
      <p className="text-sm text-muted-foreground">{t("ifu.previewEmpty")}</p>
    );
  }

  return (
    <div className="space-y-4">
      {content.intendedPurpose && (
        <Section title={t("ifu.section.intendedPurpose")}>{content.intendedPurpose}</Section>
      )}
      {content.indications && (
        <Section title={t("ifu.section.indications")}>{content.indications}</Section>
      )}
      {content.contraindications && (
        <Section title={t("ifu.section.contraindications")}>{content.contraindications}</Section>
      )}
      {warnings.length > 0 && (
        <Section title={t("ifu.section.warnings")}>
          <BulletList items={warnings} />
        </Section>
      )}
      {precautions.length > 0 && (
        <Section title={t("ifu.section.precautions")}>
          <BulletList items={precautions} />
        </Section>
      )}
      {content.instructions && (
        <Section title={t("ifu.section.instructions")}>{content.instructions}</Section>
      )}
      {content.storage && (
        <Section title={t("ifu.section.storage")}>{content.storage}</Section>
      )}
      {content.sterilityInfo && (
        <Section title={t("ifu.section.sterility")}>{content.sterilityInfo}</Section>
      )}
      {content.disposal && (
        <Section title={t("ifu.section.disposal")}>{content.disposal}</Section>
      )}
    </div>
  );
}
