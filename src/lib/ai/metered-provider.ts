import "server-only";
import type { AiProvider, ChatMessage } from "./types";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { debitAiTokens, estimateTokensFromText, getAiTokenBalance } from "@/lib/billing/ai-tokens";

export interface AiMeterContext {
  companyId: string;
  userId?: string;
  feature?: string;
}

/** Provider that debits company AI token balance after each completion. */
export class MeteredAiProvider implements AiProvider {
  readonly name: string;

  constructor(
    private readonly inner: AiProvider,
    private readonly ctx: AiMeterContext,
  ) {
    this.name = inner.name;
  }

  get modelId(): string | undefined {
    return this.inner.modelId;
  }

  async complete(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string> {
    const balance = await getAiTokenBalance(this.ctx.companyId);
    if (!balance.allowsLiveAi || balance.remaining <= 0) {
      throw new AiTokenLimitError(
        "AI token limit reached. Purchase extra tokens or upgrade your plan.",
      );
    }

    const inputText = messages.map((m) => m.content).join("\n");
    const text = await this.inner.complete(messages, opts);

    const usage = this.inner.lastUsage;
    const tokens =
      usage?.totalTokens ??
      estimateTokensFromText(inputText, text);

    await debitAiTokens(this.ctx.companyId, tokens, {
      feature: this.ctx.feature,
      userId: this.ctx.userId,
    });

    return text;
  }
}
