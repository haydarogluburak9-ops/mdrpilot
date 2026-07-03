// Server-only environment access. Never import this from a client component.

import {
  BRAND_NAME,
  BRAND_NOREPLY_EMAIL,
  BRAND_SUPPORT_EMAIL,
} from "@/lib/brand";

export type AiProviderId = "mock" | "openai" | "anthropic";

const aiProvider = (process.env.AI_PROVIDER ?? "mock").toLowerCase() as AiProviderId;

// Anthropic short aliases → concrete model ids (so AI_MODEL=claude "just works").
const ANTHROPIC_ALIASES: Record<string, string> = {
  claude: "claude-3-5-sonnet-latest",
  "claude-sonnet": "claude-3-5-sonnet-latest",
  "claude-3.5-sonnet": "claude-3-5-sonnet-latest",
  "claude-haiku": "claude-3-5-haiku-latest",
  "claude-opus": "claude-3-opus-latest",
};

function resolveModel(provider: AiProviderId, raw: string | undefined): string {
  if (provider === "anthropic") {
    const v = (raw ?? "claude").toLowerCase();
    return ANTHROPIC_ALIASES[v] ?? raw ?? "claude-3-5-sonnet-latest";
  }
  return raw ?? "gpt-4o-mini";
}

// Provider-specific key with a generic AI_API_KEY fallback.
function resolveApiKey(provider: AiProviderId): string {
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_API_KEY ?? process.env.AI_API_KEY ?? "";
  }
  return process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY ?? "";
}

export const env = {
  appName: process.env.APP_NAME ?? BRAND_NAME,
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  ai: {
    provider: aiProvider,
    apiKey: resolveApiKey(aiProvider),
    baseUrl: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
    anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1",
    anthropicVersion: process.env.ANTHROPIC_VERSION ?? "2023-06-01",
    model: resolveModel(aiProvider, process.env.AI_MODEL),
    maxTokens: Number(process.env.AI_MAX_TOKENS ?? 4000),
    temperature: Number(process.env.AI_TEMPERATURE ?? 0.2),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 60000),
    // Reasoning models (gpt-5, o-series): "minimal" | "low" | "medium" | "high".
    // Lower effort dramatically cuts latency; "low" is a good speed/quality balance.
    reasoningEffort: (process.env.AI_REASONING_EFFORT ?? "low") as "minimal" | "low" | "medium" | "high",
  },
  upload: {
    maxMb: Number(process.env.UPLOAD_MAX_MB ?? 25),
    allowedMime: (
      process.env.UPLOAD_ALLOWED_MIME ??
      "application/pdf,image/png,image/jpeg"
    ).split(","),
  },
  rateLimit: {
    windowSec: Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 60),
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120),
  },
  email: {
    from: process.env.EMAIL_FROM ?? `${BRAND_NAME} <${BRAND_NOREPLY_EMAIL}>`,
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    supportTo: process.env.SUPPORT_EMAIL ?? BRAND_SUPPORT_EMAIL,
    salesTo: process.env.SUPPORT_EMAIL ?? BRAND_SUPPORT_EMAIL,
  },
};
