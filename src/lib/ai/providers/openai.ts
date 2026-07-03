import type { AiProvider, ChatMessage } from "../types";

/**
 * OpenAI-compatible chat completions provider.
 * Works with OpenAI, Azure OpenAI-compatible gateways, or local servers (Ollama/LM Studio)
 * that expose the /v1/chat/completions contract.
 *
 * SECURITY: only ever instantiated on the server. The API key is read from server env.
 */
export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  lastUsage?: import("../types").AiTokenUsage;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly opts: {
      maxTokens: number;
      temperature: number;
      timeoutMs?: number;
      reasoningEffort?: "minimal" | "low" | "medium" | "high";
    },
  ) {}

  get modelId(): string {
    return this.model;
  }

  /**
   * Reasoning models (gpt-5 family, o1/o3/o4) use a different request contract:
   * they require `max_completion_tokens` (not `max_tokens`), reject any
   * `temperature` other than the default, and spend part of the token budget on
   * hidden reasoning. We detect them by name and adapt the payload accordingly.
   */
  private get isReasoningModel(): boolean {
    const m = this.model.toLowerCase();
    return m.startsWith("gpt-5") || /^o[134](-|$)/.test(m);
  }

  async complete(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string> {
    const controller = new AbortController();
    const timeoutMs = this.opts.timeoutMs ?? 60000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const reasoning = this.isReasoningModel;
      const body: Record<string, unknown> = {
        model: this.model,
        messages,
        ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
      };
      if (reasoning) {
        // Long regulatory drafts (e.g. full risk plan) need a large visible output budget.
        body.max_completion_tokens = Math.max(this.opts.maxTokens, 16000);
        // Lower reasoning effort sharply reduces latency (gpt-5 can otherwise take 2+ min,
        // exceeding our timeout and silently falling back to the mock engine).
        body.reasoning_effort = this.opts.reasoningEffort ?? "low";
      } else {
        body.max_tokens = this.opts.maxTokens;
        body.temperature = this.opts.temperature;
      }

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`AI provider error ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const usage = data.usage;
      if (usage) {
        this.lastUsage = {
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
        };
      } else {
        this.lastUsage = undefined;
      }
      return data.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`AI provider timeout after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
