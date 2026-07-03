import "server-only";
import { getMeteredAiProvider } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import {
  TRANSLATOR_LOCALE_AI_NAMES,
  detectDocumentLocale,
  isTranslatorLocale,
  type TranslatorLocale,
} from "./locales";

const CHUNK_SIZE = 10_000;

function localeName(locale: TranslatorLocale): string {
  return TRANSLATOR_LOCALE_AI_NAMES[locale];
}

function splitChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastBreak = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf("\n"));
      if (lastBreak > CHUNK_SIZE * 0.5) end = start + lastBreak;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

export function resolveSourceLocale(text: string, sourceLang: TranslatorLocale | "auto"): TranslatorLocale {
  if (isTranslatorLocale(sourceLang)) return sourceLang;
  return detectDocumentLocale(text);
}

async function translateChunk(
  chunk: string,
  from: TranslatorLocale,
  to: TranslatorLocale,
  companyId?: string,
): Promise<string> {
  if (from === to) return chunk;

  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  if (companyId) {
    try {
      provider = await getMeteredAiProvider({ companyId, feature: "document-translator" });
    } catch (err) {
      if (err instanceof AiTokenLimitError) throw err;
    }
  }
  if (!provider) {
    throw new Error("AI provider not configured or token limit reached");
  }

  const system = [
    `You translate regulatory / QMS / medical-device document text from ${localeName(from)} to ${localeName(to)}.`,
    "Rules:",
    "- Preserve structure: paragraph breaks, numbered lists, table row separators (|), sheet headings (# Sheet:).",
    "- Keep codes, standards (ISO, MDR), UDI, document numbers, dates and proper nouns unchanged when appropriate.",
    "- Use formal language suitable for technical documentation.",
    "- Output ONLY the translated text. No preamble.",
  ].join("\n");

  const raw = await provider.complete([
    { role: "system", content: system },
    { role: "user", content: chunk },
  ]);

  const out = raw.trim();
  return out.length > 20 ? out : chunk;
}

export async function translateDocumentText(
  text: string,
  sourceLang: TranslatorLocale | "auto",
  targetLang: TranslatorLocale,
  companyId?: string,
): Promise<string> {
  const from = resolveSourceLocale(text, sourceLang);
  if (from === targetLang) return text;

  const chunks = splitChunks(text);
  const translated: string[] = [];
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, from, targetLang, companyId));
  }
  return translated.join("\n\n");
}
