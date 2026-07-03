/** Risk Yönetim Planı 8.1.2 — risk kabul matrisi ve bölge tanımları (TF.04-04.01 referans). */

const MATRIX_ROWS_TR: string[][] = [
  ["1 İhmal edilebilir", "ACC", "ACC", "AFAP", "AFAP", "AFAP"],
  ["2 Hafif", "ACC", "AFAP", "AFAP", "AFAP", "NACC"],
  ["3 Şiddetli", "AFAP", "AFAP", "NACC", "NACC", "NACC"],
  ["4 Kritik", "AFAP", "AFAP", "NACC", "NACC", "NACC"],
  ["5 Afet", "AFAP", "AFAP", "NACC", "NACC", "NACC"],
];

const MATRIX_ROWS_EN: string[][] = [
  ["1 Negligible", "ACC", "ACC", "AFAP", "AFAP", "AFAP"],
  ["2 Minor", "ACC", "AFAP", "AFAP", "AFAP", "NACC"],
  ["3 Serious", "AFAP", "AFAP", "NACC", "NACC", "NACC"],
  ["4 Critical", "AFAP", "AFAP", "NACC", "NACC", "NACC"],
  ["5 Catastrophic", "AFAP", "AFAP", "NACC", "NACC", "NACC"],
];

function matrixMarkdown(locale: "tr" | "en"): string {
  const headers =
    locale === "tr"
      ? ["Şiddet / Olasılık", "1 Beklenmeyen", "2 Nadiren", "3 Bazen", "4 Muhtemel", "5 Sık"]
      : ["Severity / Probability", "1 Unexpected", "2 Rarely", "3 Sometimes", "4 Probable", "5 Frequent"];
  const rows = locale === "tr" ? MATRIX_ROWS_TR : MATRIX_ROWS_EN;
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ];
  return lines.join("\n");
}

export function buildRiskMatrixPlanSection(
  locale: "tr" | "en",
  fmeaRef: string,
  reportRef: string,
): string {
  if (locale === "tr") {
    return [
      "Risk yönetimi çalışması neticesinde düşürülen ve arta kalan riskler ürünün hastaya sağlayacağı yarar gözetilerek değerlendirilir. Bu değerlendirmede esas olan riskin hastaya sağladığı fayda ile kıyaslandığında makul karşılanabilip karşılanamayacağıdır.",
      "",
      "Bu doğrultuda risk ISO 14971:2019 standardı doğrultusunda şiddet ve olasılığın bileşkesi olarak tanımlanmıştır.",
      "",
      "**S:** Hata etkisinin önemi veya şiddeti.",
      "**O:** Hata türünün gerçekleşme olasılığı.",
      "",
      matrixMarkdown("tr"),
      "",
      "*Tablo 4 — Risk Kabul Edilebilirlik Kriterleri*",
      "",
      "| Bölge | Tanımlama |",
      "| --- | --- |",
      "| SARI BÖLGE (AFAP) | Kabul edilebilir risk — risk değerlendirmesinde kritere dayandırılarak kabul edilebilir. Riski daha düşük seviyelere düşürebilmek için fazladan aksiyonlar gerekebilir. |",
      "| KIRMIZI BÖLGE (N/ACC) | Tolere edilemez risk — risk değerlendirmesinde kritere dayandırılarak kabul edilemez. Riski daha düşük seviyelere indirebilmek için fazladan aksiyonlar gereklidir. |",
      "",
      "*Tablo 5 — Şiddet Seviyelerinin Muhtemel Açıklaması*",
      "",
      "| Genel Terim | Muhtemel Açıklama |",
      "| --- | --- |",
      "| Katastrofik (5 Afet) | Hasta ölümü ile sonuçlanan |",
      "| Kritik (4) | Kalıcı özürlülük veya hayati tehlikede hasarla sonuçlanan |",
      "| Şiddetli (3) | Profesyonel tıbbi müdahale gerektiren hasarla ve özürlülükle sonuçlanan |",
      "| Hafif (2) | Geçici hasar veya ürünün kullanılamaması |",
      "| Önemsiz (1) | Rahatsızlık veya geçici huzursuzluk |",
      "",
      "*Tablo 6 — Risk Olasılıklarının Muhtemel Aralıkları*",
      "",
      "| Genel Terim | Muhtemel İhtimal Aralığı |",
      "| --- | --- |",
      "| Sık (5) | ≥ 10⁻³ |",
      "| Muhtemel (4) | < 10⁻³ ve ≥ 10⁻⁴ |",
      "| Bazen (3) | < 10⁻⁴ ve ≥ 10⁻⁵ |",
      "| Nadiren (2) | < 10⁻⁵ ve ≥ 10⁻⁶ |",
      "| Beklenmeyen (1) | < 10⁻⁶ |",
      "",
      "Risk, ISO/TR 24971 Ek C.4'e göre kırmızı bölgelere (N/ACC) düşen riskler kabul edilemez olarak tanımlanır. Sarı bölgeler (AFAP) fayda-risk analizi sonucunda kabul edilebilir bulunmalıdır; bu riskler kullanım kılavuzunda bildirilir ve satış sonrası gözetim ile takip edilir.",
      "",
      `Artık riskler fayda-risk analizi kapsamında değerlendirilir ve ${reportRef} ile ${fmeaRef} formunda kayıtlandırılır.`,
    ].join("\n");
  }

  return [
    "Residual risks after control measures are evaluated against clinical benefit. Risk is defined as the combination of severity and probability per ISO 14971:2019.",
    "",
    "**S:** Significance or severity of the hazardous effect.",
    "**O:** Probability of occurrence of the hazard type.",
    "",
    matrixMarkdown("en"),
    "",
    "*Table 4 — Risk Acceptability Criteria*",
    "",
    "| Zone | Definition |",
    "| --- | --- |",
    "| YELLOW ZONE (AFAP) | Acceptable risk — may require further actions to reduce risk. |",
    "| RED ZONE (N/ACC) | Intolerable risk — further risk reduction actions required. |",
    "",
    "*Table 5 — Severity Level Descriptions*",
    "",
    "| Term | Description |",
    "| --- | --- |",
    "| Catastrophic (5) | Results in patient death |",
    "| Critical (4) | Permanent disability or life-threatening injury |",
    "| Serious (3) | Injury requiring professional medical intervention |",
    "| Minor (2) | Temporary injury or product unusability |",
    "| Negligible (1) | Discomfort or temporary inconvenience |",
    "",
    "*Table 6 — Probability Ranges*",
    "",
    "| Term | Range |",
    "| --- | --- |",
    "| Frequent (5) | ≥ 10⁻³ |",
    "| Probable (4) | < 10⁻³ and ≥ 10⁻⁴ |",
    "| Sometimes (3) | < 10⁻⁴ and ≥ 10⁻⁵ |",
    "| Rarely (2) | < 10⁻⁵ and ≥ 10⁻⁶ |",
    "| Unexpected (1) | < 10⁻⁶ |",
    "",
    `Residual risks are assessed in benefit-risk analysis and recorded in ${reportRef} and ${fmeaRef}.`,
  ].join("\n");
}

/** Plan markdown içinde 8.1.2 risk matrisi bölümünü referans yapıyla değiştirir. */
export function injectPlanRiskMatrixBlock(markdown: string, detail: string): string {
  const block = detail.trim();
  const re = /## 8\.1\.2[^\n]*\n[\s\S]*?(?=\n## 8\.2)/;
  if (re.test(markdown)) {
    const heading = markdown.match(/## 8\.1\.2[^\n]*/)?.[0] ?? "## 8.1.2 Risk Seviyeleri";
    return markdown.replace(re, `${heading}\n\n${block}\n\n`);
  }
  return `${markdown.trim()}\n\n## 8.1.2 Risk Seviyeleri\n\n${block}`;
}
