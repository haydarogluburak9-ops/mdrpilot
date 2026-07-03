import "server-only";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { getMeteredAiProvider } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import {
  TRANSLATOR_LOCALE_AI_NAMES,
  detectDocumentLocale,
  type TranslatorLocale,
} from "@/lib/document-translator/locales";
import type { Lang } from "@/lib/i18n/locales";

export type UiLocale = Lang;

export interface LocalizeMarkdownContext {
  title?: string;
  code?: string;
  companyName?: string;
}

function hashMarkdown(markdown: string): string {
  return createHash("sha256").update(markdown).digest("hex").slice(0, 24);
}

function translationCache() {
  if (!("exportTranslationCache" in prisma)) return null;
  return prisma.exportTranslationCache;
}

async function readCachedTranslation(
  entityKey: string,
  sourceHash: string,
  targetLocale: UiLocale,
): Promise<string | null> {
  const cache = translationCache();
  if (!cache) return null;
  try {
    const row = await cache.findUnique({
      where: { entityKey_sourceHash_targetLocale: { entityKey, sourceHash, targetLocale } },
      select: { markdown: true },
    });
    return row?.markdown?.trim() || null;
  } catch (err) {
    console.warn("[localized-markdown] cache read skipped", err);
    return null;
  }
}

async function writeCachedTranslation(
  entityKey: string,
  sourceHash: string,
  targetLocale: UiLocale,
  markdown: string,
): Promise<void> {
  const cache = translationCache();
  if (!cache) return;
  try {
    await cache.upsert({
      where: { entityKey_sourceHash_targetLocale: { entityKey, sourceHash, targetLocale } },
      create: { entityKey, sourceHash, targetLocale, markdown },
      update: { markdown },
    });
  } catch (err) {
    console.warn("[localized-markdown] cache write skipped", err);
  }
}

/** Heuristic: guess whether markdown is primarily Turkish or English. */
export function detectMarkdownLocale(markdown: string): UiLocale | "mixed" {
  const sample = markdown.slice(0, 12000);
  if (/[ğıüşöçİĞÜŞÖÇ]/.test(sample)) return "tr";

  const trHits =
    (sample.match(
      /\b(ve|veya|bu|için|prosedür|amaç|kapsam|kayıt|şikayet|cihaz|üretici|tanımlar|sorumluluklar|referanslar)\b/gi,
    ) ?? []).length;
  const enHits =
    (sample.match(
      /\b(the|and|or|this|procedure|purpose|scope|records|device|manufacturer|definitions|responsibilities|references)\b/gi,
    ) ?? []).length;

  if (trHits >= enHits + 3) return "tr";
  if (enHits >= trHits + 3) return "en";
  return "mixed";
}

function inferSourceLocale(detected: UiLocale | "mixed", markdown: string, target: UiLocale): UiLocale {
  if (detected === "tr" || detected === "en") return detected;
  const docLocale = detectDocumentLocale(markdown);
  if (docLocale !== target) return docLocale;
  return target === "tr" ? "en" : "tr";
}

async function translateMarkdown(
  markdown: string,
  from: TranslatorLocale,
  to: TranslatorLocale,
  context: LocalizeMarkdownContext,
  companyId?: string,
): Promise<string | null> {
  if (from === to) return markdown;

  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  if (companyId) {
    try {
      provider = await getMeteredAiProvider({ companyId, feature: "export-translate" });
    } catch (err) {
      if (err instanceof AiTokenLimitError) throw err;
    }
  }
  if (!provider) return null;

  const toName = TRANSLATOR_LOCALE_AI_NAMES[to];
  const fromName = TRANSLATOR_LOCALE_AI_NAMES[from];

  const system = [
    `You translate medical-device QMS / regulatory markdown from ${fromName} to ${toName} for controlled export.`,
    "Rules:",
    "- Preserve exact markdown structure: ## / ### headings, numbered clauses, tables, bullet lists.",
    "- Keep document codes (SOP-AN, FORM-AN-01, DIA-AN-01), standards, MDR/ISO clause numbers, UDI, placeholders like [TBC] / [TEYİT EDİLECEK] unchanged.",
    "- Use formal regulatory language appropriate for ISO 13485 / MDR audits.",
    "- Output ONLY the translated markdown. No preamble or disclaimer.",
  ].join("\n");

  const user = [
    context.code ? `Document code: ${context.code}` : "",
    context.title ? `Title: ${context.title}` : "",
    context.companyName ? `Manufacturer: ${context.companyName}` : "",
    "",
    markdown,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await provider.complete([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const out = raw.trim();
    return out.length > 40 ? out : null;
  } catch (err) {
    console.error("[localized-markdown] translation failed", err);
    return null;
  }
}

/**
 * Returns markdown in the requested locale. Uses cache; translates via AI when needed.
 */
export async function resolveLocalizedMarkdown(params: {
  markdown: string;
  targetLocale: UiLocale;
  entityKey: string;
  revisionToken: string;
  context?: LocalizeMarkdownContext;
  companyId?: string;
}): Promise<string> {
  const targetLocale = params.targetLocale;
  const source = params.markdown.trim();
  if (!source) return source;

  const detected = detectMarkdownLocale(source);
  if (detected === targetLocale) return source;

  const sourceHash = `${params.revisionToken}:${hashMarkdown(source)}`;
  const cached = await readCachedTranslation(params.entityKey, sourceHash, targetLocale);
  if (cached) return cached;

  const from = inferSourceLocale(detected, source, targetLocale);
  if (from === targetLocale) return source;

  const translated = await translateMarkdown(source, from, targetLocale, params.context ?? {}, params.companyId);
  if (!translated?.trim()) return source;

  await writeCachedTranslation(params.entityKey, sourceHash, targetLocale, translated);

  return translated;
}
