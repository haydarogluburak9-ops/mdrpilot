import { editionOf } from "@/lib/domain/standards-catalog";
import { gsprRequirementText } from "@/lib/domain/gspr-text";
import { localizeGsprNaReason } from "@/lib/domain/gspr-na-reasons";
import type { GsprRowContext } from "./gspr-justification-context";

const RM = editionOf("ISO 14971");

export function isGenericJustification(text: string | null | undefined, locale: string): boolean {
  if (!text?.trim()) return false;
  const t = text.trim();
  const patterns =
    locale === "tr"
      ? [
          /uygunluk gerekçesi teknik dosyada belgelenecektir/i,
          /uygunluk ilgili teknik dokümantasyon ve kanıtlarla gösterilecektir/i,
          /bu cihaz için uygulanır.*belgelenecektir/i,
          /tasarımı ve kullanım amacı kapsamında uygulanır/i,
        ]
      : [
          /compliance will be demonstrated in the technical documentation/i,
          /applicability rationale will be documented in the technical file/i,
          /applies to this device based on device design and intended purpose/i,
        ];
  return patterns.some((p) => p.test(t));
}

function evidenceRef(row: GsprRowContext): string {
  const parts = [...row.linkedFiles, row.evidenceDocument].filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : "teknik dosya kanıt bölümü";
}

function riskSnippet(riskBlock: string): string {
  const first = riskBlock.split("\n").find((l) => l.startsWith("- "));
  return first ? ` (${first.slice(2, 120)}…)` : "";
}

/** Rich rule-based justification when AI is unavailable. */
export function detailedRuleJustification(
  row: GsprRowContext,
  productName: string,
  intendedPurpose: string | null,
  naReason: string | undefined,
  riskBlock: string,
  locale: string,
): string {
  if (row.applicable === "NO" && naReason) {
    return localizeGsprNaReason(naReason, locale);
  }

  const std = row.standardReference ? ` (${row.standardReference})` : "";
  const purpose = intendedPurpose?.trim() || (locale === "tr" ? "tanımlanan amaç" : "defined intended purpose");
  const ev = evidenceRef(row);
  const req = gsprRequirementText(row.gsprNo, row.requirementSummary, locale === "tr" ? "tr" : "en");
  const no = row.gsprNo;
  const family = no.split(".")[0];

  if (locale === "tr") {
    if (no === "1" || family === "1") {
      return [
        `GSPR ${no}: ${productName} cihazının amaçlanan performans, güvenlik ve etkinliği ${purpose} kapsamında değerlendirilmiştir.`,
        `${RM} sürecine göre tehlike tanımlama, risk kontrol önlemleri ve artık risk değerlendirmesi yürütülmüştür; fayda-risk analizinde kalan risklerin klinik faydalarla karşılaştırıldığında kabul edilebilir olduğu görülmüştür${riskSnippet(riskBlock)}.`,
        `İlgili kayıtlar risk yönetim dosyası ve bağlı kanıtlarda (${ev}) sunulmaktadır${std}.`,
      ].join(" ");
    }
    if (family === "10") {
      return [
        `GSPR ${no}: ${productName} için kimyasal/fiziksel/biyolojik özellikler ve malzeme seçimi değerlendirilmiştir.`,
        `Biyouyumluluk/biyolojik değerlendirme planı ve test stratejisi cihazın vücut teması ve malzemelerine göre uygulanmıştır${std}.`,
        `Sonuçlar ve test/rapor referansları teknik dosyada (${ev}) belgelenmiştir.`,
      ].join(" ");
    }
    if (family === "11" && (no.includes("4") || no.includes("5"))) {
      return [
        `GSPR ${no}: ${productName} steril olarak tedarik edildiğinden sterilizasyon validasyonu gerçekleştirilmiştir.`,
        `Sterilizasyon döngüsü, biyolojik göstergeler ve ambalaj bütünlüğü doğrulanmıştır${std}.`,
        `Validasyon raporları teknik dosyada (${ev}) mevcuttur.`,
      ].join(" ");
    }
    if (family === "17") {
      return [
        `GSPR ${no}: Cihaz yazılım içerdiğinden yazılım yaşam döngüsü, doğrulama ve validasyon faaliyetleri yürütülmüştür.`,
        `Yazılım risk yönetimi ${RM} ile entegre edilmiş; güvenlik ve performans gereksinimleri test edilmiştir${std}.`,
        `Yazılım kayıtları teknik dosyada (${ev}) sunulmaktadır.`,
      ].join(" ");
    }
    if (family === "23") {
      return [
        `GSPR ${no}: ${productName} için etiket ve/veya kullanım kılavuzu (KIF) hazırlanmış ve MDR Bilgi Gereksinimleri ile uyumlu hale getirilmiştir.`,
        `Semboller, uDI, uyarılar ve kullanım talimatları kontrol edilmiştir${std}.`,
        `Güncel etiket/KIF sürümleri teknik dosyada (${ev}) yer almaktadır.`,
      ].join(" ");
    }
    return [
      `GSPR ${no} (${req.slice(0, 100)}${req.length > 100 ? "…" : ""}): ${productName} cihazının tasarımı, üretimi ve kullanım amacı (${purpose}) dikkate alınarak bu gereklilik uygulanır.`,
      `İlgili doğrulama/doğrulama faaliyetleri ve kontroller gerçekleştirilmiş; sonuçlar değerlendirilmiştir${std}.`,
      `Destekleyici kanıtlar teknik dosyada (${ev}) sunulmaktadır.`,
    ].join(" ");
  }

  // English fallback
  if (no === "1" || family === "1") {
    return [
      `GSPR ${no}: Intended performance, safety and effectiveness of ${productName} were assessed for ${purpose}.`,
      `Per ${RM}, hazard identification, risk controls and residual risk evaluation were performed; benefit-risk analysis shows acceptable residual risks${riskSnippet(riskBlock)}.`,
      `Records are provided in the risk management file and linked evidence (${ev})${std}.`,
    ].join(" ");
  }
  return [
    `GSPR ${no}: This requirement applies to ${productName} (${purpose}) based on device design and use.`,
    `Relevant verification/validation activities were performed and results evaluated${std}.`,
    `Supporting evidence is presented in the technical file (${ev}).`,
  ].join(" ");
}
