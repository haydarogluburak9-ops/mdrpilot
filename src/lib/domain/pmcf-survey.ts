export type PmcfSurveyQuestionType = "yes_no" | "likert_5" | "frequency" | "open";

export interface PmcfSurveyQuestion {
  id: string;
  text: string;
  responseType?: PmcfSurveyQuestionType;
}

export interface PmcfSurvey {
  intro: string;
  method: string;
  targetPopulation: string;
  sampleSizeNote: string;
  questions: PmcfSurveyQuestion[];
  locale: "tr" | "en";
  generatedAt: string;
  source?: "openai" | "anthropic" | "mock" | "template";
}

export type { SectionExtras } from "@/lib/domain/section-extras";
export { parseSectionExtras, mergeSectionExtras } from "@/lib/domain/section-extras";

const RESPONSE_LABEL: Record<PmcfSurveyQuestionType, { tr: string; en: string }> = {
  yes_no: { tr: "Evet/Hayır + açıklama", en: "Yes/No + comment" },
  likert_5: { tr: "1–5 Likert + yorum", en: "1–5 Likert + comment" },
  frequency: { tr: "Sıklık seçenekleri", en: "Frequency options" },
  open: { tr: "Açık uçlu", en: "Open text" },
};

export function formatPmcfSurveyMarkdown(survey: PmcfSurvey): string {
  const tr = survey.locale === "tr";
  const lines: string[] = [
    survey.intro.trim(),
    "",
    tr ? "**Anket yöntemi**" : "**Survey method**",
    survey.method.trim(),
    "",
    tr ? "**Hedef popülasyon**" : "**Target population**",
    survey.targetPopulation.trim(),
    "",
    tr ? "**Örneklem / kabul kriterleri**" : "**Sample size / acceptance criteria**",
    survey.sampleSizeNote.trim(),
    "",
    tr ? "**Sorular**" : "**Questions**",
  ];

  survey.questions.forEach((q, i) => {
    const type = q.responseType ? RESPONSE_LABEL[q.responseType][survey.locale] : "";
    lines.push(`${i + 1}. ${q.text.trim()}${type ? ` _(${type})_` : ""}`);
  });

  lines.push(
    "",
    tr
      ? "_Saha kullanımından önce klinik kullanıcılarla doğrulanmalıdır (MDCG 2020-7)._"
      : "_Validate with clinical users before field use (MDCG 2020-7)._",
  );

  return lines.join("\n");
}

export function defaultSurveyResultsPlaceholder(locale: "tr" | "en"): string {
  const tr = locale === "tr";
  return [
    (tr ? "Raporlama dönemi" : "Reporting period") + ": ",
    (tr ? "Yanıt oranı (n/N)" : "Response rate (n/N)") + ": ",
    (tr ? "Kabul kriterlerine göre temel bulgular" : "Key findings vs. acceptance criteria") + ":",
    "",
    (tr ? "Yanıt özeti" : "Summary of responses") + ":",
    "",
    (tr ? "Ham anket verisi / kayıtlarına bağlantı" : "Link to raw survey data / records") + ": ",
  ].join("\n");
}

/** Replace body under a ## heading (matched by regex) until the next ## heading. */
export function replaceMarkdownSection(
  markdown: string,
  headingRe: RegExp,
  newBody: string,
): string {
  const lines = markdown.split("\n");
  let start = -1;
  let end = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("##")) continue;
    if (headingRe.test(line)) {
      start = i + 1;
      continue;
    }
    if (start >= 0) {
      end = i;
      break;
    }
  }

  if (start < 0) {
    const heading =
      headingRe.source.includes("anket") || headingRe.source.includes("uestionnaire")
        ? "## Özel PMCF Yöntemleri — Anket / Soru Formu"
        : "## Sonuçlar — Anket / Soru Formu";
    return markdown.trim()
      ? `${markdown.trim()}\n\n${heading}\n\n${newBody.trim()}`
      : `${heading}\n\n${newBody.trim()}`;
  }

  const before = lines.slice(0, start);
  const after = lines.slice(end);
  return [...before, "", newBody.trim(), "", ...after].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
