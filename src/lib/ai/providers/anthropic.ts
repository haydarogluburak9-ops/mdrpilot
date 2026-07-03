import type { AiProvider, ChatMessage } from "../types";

/**
 * Anthropic Messages API provider (Claude).
 * Implements the same AiProvider contract as OpenAiProvider so the orchestrator
 * and module engines can swap providers without code changes.
 *
 * SECURITY: only ever instantiated on the server. The API key is read from server env.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  lastUsage?: import("../types").AiTokenUsage;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly version: string,
    private readonly model: string,
    private readonly opts: { maxTokens: number; temperature: number; timeoutMs?: number },
  ) {}

  get modelId(): string {
    return this.model;
  }

  async complete(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string> {
    // Anthropic separates the system prompt from the message turns.
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const turns = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    // Nudge JSON-only output (Anthropic has no response_format flag).
    const systemPrompt = opts?.json
      ? `${system}\n\nRespond with a single valid JSON object only. Do not wrap it in markdown fences or add prose before or after.`
      : system;

    const controller = new AbortController();
    const timeoutMs = this.opts.timeoutMs ?? 60000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": this.version,
        },
        body: JSON.stringify({
          model: this.model,
          system: systemPrompt,
          messages: turns,
          temperature: this.opts.temperature,
          max_tokens: this.opts.maxTokens,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`AI provider error ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = (data.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("");
      if (data.usage) {
        this.lastUsage = {
          promptTokens: data.usage.input_tokens ?? 0,
          completionTokens: data.usage.output_tokens ?? 0,
          totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
        };
      } else {
        this.lastUsage = undefined;
      }
      return text;
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
