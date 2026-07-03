import "server-only";
import { getMeteredAiProvider, extractJson, aiProviderInfo } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { formatAppliedReferencesField } from "@/lib/domain/applicable-references";

export interface SuggestInput {
  name: string;
  deviceClass: string;
  isInvasive: boolean;
  hasMeasuringFn: boolean;
  containsSoftware: boolean;
  brands: string[];
  models: string[];
  sterilizations: string[];
  lang: "tr" | "en";
}

export interface ProductSuggestion {
  intendedPurpose: string;
  userProfile: string;
  patientPopulation: string;
  indications: string;
  contraindications: string;
  materials: string;
  appliedStandards: string;
  source: "ai" | "fallback";
  model: string | null;
}

/** Flatten an AI value (string | array | object) into a plain text string. */
function asText(v: unknown, sep: string): string {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        typeof x === "string"
          ? x
          : x && typeof x === "object"
            ? Object.values(x).map(String).join(" ")
            : String(x),
      )
      .map((s) => s.trim())
      .filter(Boolean)
      .join(sep);
  }
  if (v && typeof v === "object") {
    return Object.values(v).map(String).map((s) => s.trim()).filter(Boolean).join(sep);
  }
  return "";
}

/** Find a value by any of several accepted key aliases (case-insensitive). */
function pick(obj: Record<string, unknown>, aliases: string[]): unknown {
  for (const key of Object.keys(obj)) {
    if (aliases.includes(key.toLowerCase())) return obj[key];
  }
  return undefined;
}

/**
 * Tolerantly extract the three descriptive fields from the model output. GPT-5
 * sometimes returns Turkish key names or arrays instead of the requested English
 * string keys, so we normalise both shape and key aliases here.
 */
function normalize(parsed: unknown): Omit<ProductSuggestion, "source" | "model"> | null {
  if (!parsed || typeof parsed !== "object") return null;
  const rec = parsed as Record<string, unknown>;
  const intendedPurpose = asText(
    pick(rec, ["intendedpurpose", "intended_purpose", "purpose", "amaclanankullanim", "kullanimamaci", "amac"]),
    " ",
  );
  const userProfile = asText(
    pick(rec, ["userprofile", "user_profile", "intendeduser", "user", "hedefkullanici", "kullanici"]),
    " ",
  );
  const patientPopulation = asText(
    pick(rec, ["patientpopulation", "patient_population", "patients", "hastapopulasyonu", "hasta", "hastapopulasyon"]),
    " ",
  );
  const indications = asText(
    pick(rec, ["indications", "indication", "endikasyonlar", "endikasyon"]),
    "\n",
  );
  const contraindications = asText(
    pick(rec, ["contraindications", "contraindication", "kontraendikasyonlar", "kontrendikasyonlar", "kontraendikasyon"]),
    "\n",
  );
  const materials = asText(pick(rec, ["materials", "malzemeler", "malzeme"]), "\n");
  const appliedStandards = asText(
    pick(rec, ["appliedstandards", "applied_standards", "standards", "uygulananstandartlar", "standartlar"]),
    "\n",
  );
  return { intendedPurpose, userProfile, patientPopulation, indications, contraindications, materials, appliedStandards };
}

function systemPrompt(lang: "tr" | "en"): string {
  const langLine =
    lang === "tr"
      ? "Write all field values in Turkish."
      : "Write all field values in English.";
  return [
    "You are a regulatory documentation assistant for medical device manufacturers (MDR 2017/745, ISO 13485, ISO 14971).",
    "You draft ONLY descriptive, editable suggestions for these fields: intendedPurpose, userProfile, patientPopulation, indications, contraindications, materials, appliedStandards.",
    "PRIMARY SIGNAL: infer the specific medical device type from the PRODUCT NAME (it may be written in Turkish or English).",
    "Tailor all three fields specifically to that inferred device type. The name is more informative than the generic class; if the class looks like a default, still reason from the name.",
    "Examples of name-driven reasoning: a name implying a wound dressing -> materials like nonwoven/hydrocolloid and standards like ISO 10993; a name implying a surgical cannula -> stainless steel 316L and sterilization standards; a name implying software -> IEC 62304.",
    "Rules:",
    "- These are DRAFT suggestions a human must review and approve.",
    "- Do NOT invent identity facts: never fabricate brand names, model codes, UDI, or specific manufacturer claims.",
    "- If the product name is empty or too vague to identify a device type, keep suggestions generic and say so briefly in intendedPurpose.",
    "- 'intendedPurpose': 2-3 sentences on the medical purpose of THIS device (per the name) — what clinical need it addresses. Do NOT repeat user/patient here.",
    "- 'userProfile': who is intended to use the device (e.g. surgeon, nurse, trained clinician, lay/home user), and required training/environment.",
    "- 'patientPopulation': the target patient group (e.g. adults, paediatric, specific condition/indication, anatomy), and any key exclusions.",
    "- 'indications': clinical indications for use (when the device should be used), as a short list.",
    "- 'contraindications': situations where the device must NOT be used, as a short list.",
    "- 'materials': a plausible, clearly-typical list of materials for this specific device type (mark as typical, not confirmed).",
    "- 'appliedStandards': applicable legislation (MDR articles/annexes), relevant MDCG guidance documents, and harmonised/applied standards for THIS device — grouped under three headings.",
    "- Keep each field concise and professional.",
    langLine,
    'OUTPUT FORMAT: a single JSON object with EXACTLY these keys: "intendedPurpose", "userProfile", "patientPopulation", "indications", "contraindications", "materials", "appliedStandards".',
    "Each value MUST be a plain string (not an array or nested object). For lists (materials, standards), put each item on its own line separated by \\n.",
    "Do not add any other keys.",
  ].join("\n");
}

function userPrompt(input: SuggestInput): string {
  const lines = [
    `Device / technical file name: ${input.name || "(unnamed)"}`,
    `Device class (MDR): ${input.deviceClass}`,
    `Invasive: ${input.isInvasive ? "yes" : "no"}`,
    `Measuring function: ${input.hasMeasuringFn ? "yes" : "no"}`,
    `Contains software: ${input.containsSoftware ? "yes" : "no"}`,
  ];
  if (input.sterilizations.length) lines.push(`Sterilization method(s): ${input.sterilizations.join(", ")}`);
  if (input.brands.length) lines.push(`Brands (do not repeat as facts): ${input.brands.join(", ")}`);
  if (input.models.length)
    lines.push(`Example model codes (identity only, do not invent more): ${input.models.slice(0, 8).join(", ")}`);
  return lines.join("\n");
}

/** Deterministic fallback used when no AI provider is configured or the call fails. */
function fallback(input: SuggestInput, lang: "tr" | "en"): ProductSuggestion {
  const sterile = input.sterilizations.length > 0;
  const tr = lang === "tr";
  const intendedPurpose = tr
    ? `${input.name || "Cihaz"}, ${input.deviceClass} sınıfı bir tıbbi cihazdır. Cihazın karşıladığı klinik ihtiyacı burada tanımlayın. (AI taslağı — lütfen gerçek kullanım amacınızla güncelleyin.)`
    : `${input.name || "The device"} is a ${input.deviceClass} medical device. Define here the clinical need it addresses. (AI draft — please update with your real intended purpose.)`;
  const userProfile = tr
    ? "Hedef kullanıcı burada tanımlanmalıdır (örn. eğitimli sağlık personeli / cerrah / hemşire veya ev kullanıcısı), gerekli eğitim ve kullanım ortamı. Doğrulanmamış taslak."
    : "Define the intended user here (e.g. trained clinician / surgeon / nurse, or lay/home user), required training and use environment. Unconfirmed draft.";
  const patientPopulation = tr
    ? "Hedef hasta popülasyonu burada tanımlanmalıdır (örn. yetişkin/pediatrik, ilgili endikasyon/anatomi ve dışlama kriterleri). Doğrulanmamış taslak."
    : "Define the target patient population here (e.g. adult/paediatric, relevant indication/anatomy and exclusions). Unconfirmed draft.";
  const indications = tr
    ? "Cihazın kullanım endikasyonları burada listelenmelidir. Doğrulanmamış taslak."
    : "List the clinical indications for use here. Unconfirmed draft.";
  const contraindications = tr
    ? "Cihazın kullanılmaması gereken durumlar (kontrendikasyonlar) burada listelenmelidir. Doğrulanmamış taslak."
    : "List the contraindications (when the device must not be used) here. Unconfirmed draft.";
  const materials = tr
    ? "Tipik malzemeler buraya yazılmalıdır (örn. paslanmaz çelik 316L, medikal silikon, PE/PP). Doğrulanmamış taslak."
    : "List typical materials here (e.g. stainless steel 316L, medical-grade silicone, PE/PP). Unconfirmed draft.";
  const appliedStandards = formatAppliedReferencesField(
    {
      deviceClass: input.deviceClass,
      isSterile: input.sterilizations.length > 0,
      sterilization: input.sterilizations[0] ?? null,
      isInvasive: input.isInvasive,
      containsSoftware: input.containsSoftware,
      hasMeasuringFn: input.hasMeasuringFn,
    },
    lang,
  );
  return {
    intendedPurpose,
    userProfile,
    patientPopulation,
    indications,
    contraindications,
    materials,
    appliedStandards,
    source: "fallback",
    model: null,
  };
}

export async function suggestProductDetails(input: SuggestInput, companyId: string): Promise<ProductSuggestion> {
  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  try {
    provider = await getMeteredAiProvider({ companyId, feature: "product-suggest" });
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
  }
  if (!provider) return fallback(input, input.lang);

  try {
    const raw = await provider.complete(
      [
        { role: "system", content: systemPrompt(input.lang) },
        { role: "user", content: userPrompt(input) },
      ],
      { json: true },
    );
    const normalized = normalize(extractJson(raw));
    if (!normalized) return fallback(input, input.lang);
    const hasAny = Object.values(normalized).some((v) => v && v.length > 0);
    if (!hasAny) return fallback(input, input.lang);
    return {
      ...normalized,
      source: "ai",
      model: provider.modelId ?? aiProviderInfo().model,
    };
  } catch {
    return fallback(input, input.lang);
  }
}
