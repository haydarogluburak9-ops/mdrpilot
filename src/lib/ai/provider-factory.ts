import "server-only";
import { env } from "@/lib/env";
import type { AiProvider } from "./types";
import { OpenAiProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { MeteredAiProvider, type AiMeterContext } from "./metered-provider";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { getAiTokenBalance } from "@/lib/billing/ai-tokens";

export type { AiMeterContext };

export interface AiProviderInfo {
  provider: "mock" | "openai" | "anthropic";
  model: string;
  configured: boolean;
}

/**
 * Returns the configured live provider without metering (eval harness, internal tools).
 */
export function getAiProvider(): AiProvider | null {
  return buildRawProvider();
}

/**
 * Live provider with company token metering. Returns null when no API key, no tokens,
 * or starter plan with zero allowance — callers fall back to mock engine.
 */
export async function getMeteredAiProvider(ctx: AiMeterContext): Promise<AiProvider | null> {
  const raw = buildRawProvider();
  if (!raw) return null;

  const balance = await getAiTokenBalance(ctx.companyId);
  if (!balance.allowsLiveAi) return null;
  if (balance.remaining <= 0) {
    throw new AiTokenLimitError(
      "AI token limit reached. Purchase extra tokens or upgrade your plan.",
    );
  }

  return new MeteredAiProvider(raw, ctx);
}

function buildRawProvider(): AiProvider | null {
  const { provider, apiKey, model, baseUrl, anthropicBaseUrl, anthropicVersion, maxTokens, temperature, timeoutMs, reasoningEffort } = env.ai;
  if (!apiKey) return null;

  if (provider === "openai") {
    return new OpenAiProvider(apiKey, baseUrl, model, { maxTokens, temperature, timeoutMs, reasoningEffort });
  }
  if (provider === "anthropic") {
    return new AnthropicProvider(apiKey, anthropicBaseUrl, anthropicVersion, model, { maxTokens, temperature, timeoutMs });
  }
  return null; // mock mode
}

/** Provider/model descriptor for audit logging and scorecards. */
export function aiProviderInfo(): AiProviderInfo {
  return {
    provider: env.ai.provider,
    model: env.ai.model,
    configured: env.ai.provider !== "mock" && Boolean(env.ai.apiKey),
  };
}

/** Resolve a provider-specific API key from env (used by the evaluation harness). */
function keyFor(provider: "openai" | "anthropic"): string {
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY ?? process.env.AI_API_KEY ?? "";
  return process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY ?? "";
}

/** Which live providers have an API key configured (for provider comparison). */
export function availableProviders(): ("openai" | "anthropic")[] {
  const out: ("openai" | "anthropic")[] = [];
  if (keyFor("openai")) out.push("openai");
  if (keyFor("anthropic")) out.push("anthropic");
  return out;
}

/**
 * Builds a specific provider by id with an optional model override, regardless of
 * the globally-configured AI_PROVIDER. Returns null if no key is configured.
 * Used by the evaluation harness to benchmark OpenAI vs Anthropic in one process.
 */
export function buildNamedProvider(provider: "openai" | "anthropic", modelOverride?: string): AiProvider | null {
  const key = keyFor(provider);
  if (!key) return null;
  const { baseUrl, anthropicBaseUrl, anthropicVersion, model, maxTokens, temperature, timeoutMs, reasoningEffort } = env.ai;
  if (provider === "openai") {
    return new OpenAiProvider(key, baseUrl, modelOverride ?? (env.ai.provider === "openai" ? model : "gpt-4o-mini"), {
      maxTokens, temperature, timeoutMs, reasoningEffort,
    });
  }
  return new AnthropicProvider(key, anthropicBaseUrl, anthropicVersion, modelOverride ?? (env.ai.provider === "anthropic" ? model : "claude-3-5-sonnet-latest"), {
    maxTokens, temperature, timeoutMs,
  });
}

/**
 * Robust JSON extraction shared by every engine: parses raw model output,
 * tolerating markdown fences and leading/trailing prose. Returns null on failure
 * so callers can fall back to the deterministic engine.
 */
export function extractJson(text: string): unknown | null {
  if (!text) return null;
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
