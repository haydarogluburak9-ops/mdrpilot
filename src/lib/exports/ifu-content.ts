import "server-only";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { flattenDeclarationModels } from "./declaration-models";
import type { ExportContext } from "./types";

export interface IfuContentOverride {
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

export interface IfuContentBlock {
  intendedPurpose: string;
  indications: string;
  contraindications: string;
  warnings: string[];
  precautions: string[];
  instructions: string;
  storage: string;
  sterilityInfo: string;
  disposal: string;
  deviceDescription: string;
  modelList: string;
}

const STER_TR: Record<string, string> = {
  EO: "Etilen oksit (EO)",
  GAMMA: "Gama radyasyonu",
  STEAM: "Buhar",
  OTHER: "Diğer",
  NON_STERILE: "Steril değil",
};

function classTr(code: string): string {
  return (DEVICE_CLASS_LABEL as Record<string, string>)[code] ?? code;
}

function riskWarnings(ctx: ExportContext): string[] {
  const p = ctx.product;
  if (!p) return [];
  return p.riskItems
    .filter((r) => r.initialRiskLevel === "HIGH" || r.initialRiskLevel === "CRITICAL")
    .map((r) => {
      const harm = r.harm?.trim() || r.hazard;
      const control = r.riskControlMeasure?.trim();
      return control ? `${harm} — ${control}` : harm;
    });
}

function defaultWarnings(ctx: ExportContext, tr: boolean): string[] {
  const p = ctx.product!;
  const items = riskWarnings(ctx);
  if (items.length) return items;
  const base: string[] = [];
  if (p.isSterile) {
    base.push(
      tr
        ? "Ambalaj hasarlı veya açılmışsa kullanmayın."
        : "Do not use if packaging is damaged or open.",
    );
  }
  if (!p.isReusable) {
    base.push(tr ? "Tek kullanımlıktır; yeniden kullanmayın veya yeniden sterilize etmeyin." : "Single use — do not reuse or re-sterilize.");
  }
  if (p.isInvasive) {
    base.push(tr ? "Yalnızca eğitimli sağlık personeli tarafından kullanılmalıdır." : "For use by trained healthcare professionals only.");
  }
  return base.length
    ? base
    : [tr ? "Kullanmadan önce IFU'yu okuyunuz." : "Read the IFU before use."];
}

function defaultPrecautions(ctx: ExportContext, tr: boolean): string[] {
  const p = ctx.product!;
  const items: string[] = [
    tr ? "Kullanmadan önce ambalaj bütünlüğünü ve son kullanma tarihini kontrol edin." : "Check package integrity and expiry before use.",
    tr ? "Steril bariyer hasarlıysa kullanmayın." : "Do not use if the sterile barrier is compromised.",
  ];
  if (p.hasMeasuringFn) {
    items.push(tr ? "Ölçüm fonksiyonunu kullanmadan önce kalibrasyon durumunu doğrulayın." : "Verify calibration before using the measuring function.");
  }
  if (p.containsSoftware) {
    items.push(tr ? "Yazılım güncellemelerini üretici talimatlarına uygun uygulayın." : "Apply software updates per manufacturer instructions.");
  }
  return items;
}

function defaultInstructions(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const parts: string[] = [];
  if (tr) {
    parts.push(`${p.name} yalnızca tanımlanan kullanım amacı için kullanılmalıdır.`);
    if (p.isSterile) parts.push("Aseptik tekniğe uygun olarak açın ve uygulayın.");
    if (p.materials?.trim()) parts.push(`Malzeme: ${p.materials.trim()}.`);
    parts.push("Uygulama sonrası cihazı uygun şekilde bertaraf edin.");
  } else {
    parts.push(`Use ${p.name} only for the stated intended purpose.`);
    if (p.isSterile) parts.push("Open and apply using aseptic technique.");
    if (p.materials?.trim()) parts.push(`Materials: ${p.materials.trim()}.`);
    parts.push("Dispose of the device appropriately after use.");
  }
  return parts.join(" ");
}

function defaultStorage(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const shelf = p.shelfLife?.trim();
  if (tr) {
    return shelf
      ? `Kuru ve temiz bir ortamda, doğrudan güneş ışığından uzak saklayın. Raf ömrü: ${shelf}.`
      : "Kuru ve temiz bir ortamda, 15–25 °C arasında saklayın.";
  }
  return shelf
    ? `Store in a dry, clean place away from direct sunlight. Shelf life: ${shelf}.`
    : "Store in a dry, clean place at 15–25 °C.";
}

function defaultSterility(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  if (!p.isSterile) return tr ? "Ürün steril değildir." : "Product is non-sterile.";
  const method = STER_TR[p.sterilization] ?? p.sterilization;
  if (tr) {
    return `Ürün ${method} ile sterilize edilmiştir. Steril bariyer açılana kadar sterilite korunur. Tek kullanımlıktır.`;
  }
  return `Product is sterilized by ${p.sterilization}. Sterility is maintained until the sterile barrier is opened. Single use.`;
}

function defaultDisposal(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  if (tr) {
    return p.isInvasive
      ? "Kullanılmış cihazı kesici/delici atık ve tıbbi atık mevzuatına uygun şekilde bertaraf edin."
      : "Yerel tıbbi atık ve çevre mevzuatına uygun olarak bertaraf edin.";
  }
  return p.isInvasive
    ? "Dispose as sharps/medical waste per local regulations."
    : "Dispose according to local medical waste regulations.";
}

function deviceDescription(ctx: ExportContext, tr: boolean): string {
  const p = ctx.product!;
  const cls = classTr(p.deviceClass);
  const parts = [
    tr ? `Ticari adı: ${p.name}` : `Trade name: ${p.name}`,
    tr ? `Sınıf: ${cls}` : `Class: ${cls}`,
    p.basicUdiDi ? `UDI-DI (temel): ${p.basicUdiDi}` : "",
    p.udiDi ? `UDI-DI: ${p.udiDi}` : "",
    p.packagingType?.trim() ? (tr ? `Ambalaj: ${p.packagingType}` : `Packaging: ${p.packagingType}`) : "",
  ].filter(Boolean);
  return parts.join(tr ? " · " : " · ");
}

export function buildIfuContent(ctx: ExportContext, override?: IfuContentOverride): IfuContentBlock {
  const p = ctx.product!;
  const tr = ctx.language === "tr";
  const models = flattenDeclarationModels(p.name, p.variantsJson, null, p.model, p.brand);
  const modelList = models.map((m) => `${m.orderNo}. ${m.modelName} (${m.sterilization})`).join("\n");

  const warnings = override?.warnings?.length ? override.warnings : defaultWarnings(ctx, tr);
  const precautions = override?.precautions?.length ? override.precautions : defaultPrecautions(ctx, tr);

  return {
    intendedPurpose: override?.intendedPurpose?.trim() || p.intendedPurpose?.trim() || (tr ? "Belirtilmemiş — ürün dosyasında tanımlayın." : "Not specified — define in product dossier."),
    indications: override?.indications?.trim() || p.indications?.trim() || (tr ? "Ürün dosyasında endikasyonları tanımlayın." : "Define indications in the product dossier."),
    contraindications: override?.contraindications?.trim() || p.contraindications?.trim() || (tr ? "Ürün dosyasında kontrendikasyonları tanımlayın." : "Define contraindications in the product dossier."),
    warnings,
    precautions,
    instructions: override?.instructions?.trim() || defaultInstructions(ctx, tr),
    storage: override?.storage?.trim() || defaultStorage(ctx, tr),
    sterilityInfo: override?.sterilityInfo?.trim() || defaultSterility(ctx, tr),
    disposal: override?.disposal?.trim() || defaultDisposal(ctx, tr),
    deviceDescription: deviceDescription(ctx, tr),
    modelList,
  };
}
