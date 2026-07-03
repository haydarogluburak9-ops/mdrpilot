import "server-only";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { PROMPTS, type PromptId } from "./prompts";
import { getAiProvider, getMeteredAiProvider, aiProviderInfo, extractJson } from "./provider-factory";
import type { AiMeterContext } from "./provider-factory";
import { mockGenerate } from "./mock";
import { aiResultSchema, type AiResult, type ChatMessage } from "./types";

export interface RunPromptMeta {
  source: "openai" | "anthropic" | "mock";
  provider: "openai" | "anthropic" | "mock";
  model: string;
  latencyMs: number;
}

/**
 * Runs a regulatory prompt and ALWAYS returns a valid AiResult.
 * - Validates input defensively against the prompt's zod schema.
 * - Uses the live provider when configured; otherwise the deterministic mock.
 * - Falls back to mock output if the provider errors, times out or returns malformed JSON.
 */
import { TRANSLATOR_LOCALE_AI_NAMES } from "@/lib/document-translator/locales";

const LANGUAGE_NAMES: Record<string, string> = {
  ...TRANSLATOR_LOCALE_AI_NAMES,
};

/**
 * Directs the model to write all natural-language output in the user's UI language,
 * while keeping regulatory identifiers, standard codes and clause numbers untouched.
 */
function languageDirective(locale: string): string {
  const lang = LANGUAGE_NAMES[locale];
  if (!lang || locale === "en") return "";
  return [
    `IMPORTANT — OUTPUT LANGUAGE: Write ALL natural-language text in the JSON`,
    `(the "summary", "missingItems", "risks", "recommendedDocuments" and "disclaimer" fields)`,
    `in ${lang}. Keep regulatory identifiers, standard codes, clause numbers and references`,
    `(e.g. "MDR 2017/745 Annex II", "ISO 14971", "EN ISO 11607-1") in their original form.`,
    `The JSON keys and the "complianceStatus" enum value must stay exactly as specified (English).`,
  ].join(" ");
}

export async function runPrompt<Id extends PromptId>(
  promptId: Id,
  rawInput: unknown,
  meter?: AiMeterContext,
): Promise<{ result: AiResult; source: RunPromptMeta["source"]; meta: RunPromptMeta }> {
  const prompt = PROMPTS[promptId];
  const locale = typeof (rawInput as any)?._locale === "string" ? (rawInput as any)._locale : "en";
  const parsed = prompt.inputSchema.safeParse(rawInput);
  const input = parsed.success ? parsed.data : (rawInput as any);

  const info = aiProviderInfo();
  const started = Date.now();

  const mockMeta = (): RunPromptMeta => ({ source: "mock", provider: "mock", model: "mock", latencyMs: Date.now() - started });

  let provider = getAiProvider();
  if (meter) {
    try {
      provider = await getMeteredAiProvider({ ...meter, feature: meter.feature ?? promptId });
    } catch (err) {
      if (err instanceof AiTokenLimitError) throw err;
      provider = null;
    }
  }

  if (!provider) {
    return { result: mockGenerate(promptId, input), source: "mock", meta: mockMeta() };
  }

  try {
    const directive = languageDirective(locale);
    const messages: ChatMessage[] = [
      { role: "system", content: directive ? `${prompt.system}\n\n${directive}` : prompt.system },
      { role: "user", content: prompt.buildUser(input as never) },
    ];
    const raw = await provider.complete(messages, { json: true });
    const json = extractJson(raw);
    const validated = aiResultSchema.safeParse(json);
    if (!validated.success) {
      return { result: mockGenerate(promptId, input), source: "mock", meta: mockMeta() };
    }
    const src = info.provider === "anthropic" ? "anthropic" : "openai";
    return {
      result: validated.data,
      source: src,
      meta: { source: src, provider: src, model: info.model, latencyMs: Date.now() - started },
    };
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
    console.error(`[ai] provider failed for ${promptId}, falling back to mock`, err);
    return { result: mockGenerate(promptId, input), source: "mock", meta: mockMeta() };
  }
}
