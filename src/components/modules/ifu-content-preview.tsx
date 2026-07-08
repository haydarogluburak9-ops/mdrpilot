"use client";

import { useI18n } from "@/components/providers/i18n-provider";

export interface IfuPreviewContent {
  productDescription?: string;
  technicalSpecifications?: string;
  intendedPurpose?: string;
  intendedUsers?: string;
  patientPopulation?: string;
  clinicalBenefits?: string;
  indications?: string;
  contraindications?: string;
  warnings?: string[];
  precautions?: string[];
  instructions?: string;
  biocompatibility?: string;
  storage?: string;
  shelfLifeDetail?: string;
  sterilityInfo?: string;
  disposal?: string;
  wasteSeparation?: string;
  mdrAnnexIDeclaration?: string;
  incidentReporting?: string;
  troubleshooting?: string[];
  symbolsGlossary?: string[];
  regulatoryInfo?: string;
  revisionHistory?: string;
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
      {items.map((item, i) => (
        <li key={`${item.slice(0, 40)}-${i}`}>{item}</li>
      ))}
    </ul>
  );
}

const PREVIEW_SECTIONS: { key: keyof IfuPreviewContent; labelKey: string; list?: boolean }[] = [
  { key: "productDescription", labelKey: "ifu.section.productDescription" },
  { key: "technicalSpecifications", labelKey: "ifu.section.technicalSpecs" },
  { key: "intendedPurpose", labelKey: "ifu.section.intendedPurpose" },
  { key: "intendedUsers", labelKey: "ifu.section.intendedUsers" },
  { key: "patientPopulation", labelKey: "ifu.section.patientPopulation" },
  { key: "clinicalBenefits", labelKey: "ifu.section.clinicalBenefits" },
  { key: "indications", labelKey: "ifu.section.indications" },
  { key: "contraindications", labelKey: "ifu.section.contraindications" },
  { key: "warnings", labelKey: "ifu.section.warnings", list: true },
  { key: "precautions", labelKey: "ifu.section.precautions", list: true },
  { key: "instructions", labelKey: "ifu.section.instructions" },
  { key: "biocompatibility", labelKey: "ifu.section.biocompatibility" },
  { key: "storage", labelKey: "ifu.section.storage" },
  { key: "shelfLifeDetail", labelKey: "ifu.section.shelfLife" },
  { key: "sterilityInfo", labelKey: "ifu.section.sterility" },
  { key: "disposal", labelKey: "ifu.section.disposal" },
  { key: "wasteSeparation", labelKey: "ifu.section.wasteSeparation" },
  { key: "mdrAnnexIDeclaration", labelKey: "ifu.section.mdrAnnexI" },
  { key: "incidentReporting", labelKey: "ifu.section.incidentReporting" },
  { key: "troubleshooting", labelKey: "ifu.section.troubleshooting", list: true },
  { key: "symbolsGlossary", labelKey: "ifu.section.symbolsGlossary", list: true },
  { key: "regulatoryInfo", labelKey: "ifu.section.regulatory" },
  { key: "revisionHistory", labelKey: "ifu.section.revisionHistory" },
];

export function IfuContentPreview({ content }: { content: IfuPreviewContent }) {
  const { t } = useI18n();

  const hasContent = PREVIEW_SECTIONS.some(({ key, list }) => {
    const val = content[key];
    if (list) return Array.isArray(val) && val.filter(Boolean).length > 0;
    return typeof val === "string" && val.trim().length > 0;
  });

  if (!hasContent) {
    return <p className="text-sm text-muted-foreground">{t("ifu.previewEmpty")}</p>;
  }

  return (
    <div className="space-y-4">
      {PREVIEW_SECTIONS.map(({ key, labelKey, list }) => {
        const val = content[key];
        if (list) {
          const items = Array.isArray(val) ? val.filter(Boolean) : [];
          if (!items.length) return null;
          return (
            <Section key={key} title={t(labelKey)}>
              <BulletList items={items} />
            </Section>
          );
        }
        if (typeof val !== "string" || !val.trim()) return null;
        return (
          <Section key={key} title={t(labelKey)}>
            {val}
          </Section>
        );
      })}
    </div>
  );
}
