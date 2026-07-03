import { z } from "zod";

// Canonical structured output that every regulatory prompt returns.
export const aiResultSchema = z.object({
  summary: z.string(),
  complianceStatus: z.enum(["compliant", "partial", "non_compliant", "unknown"]),
  missingItems: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  recommendedDocuments: z.array(z.string()).default([]),
  regulatoryReferences: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  disclaimer: z.string(),
  data: z.unknown().optional(),
});

export type AiResult = z.infer<typeof aiResultSchema>;

export interface PromptDefinition<TInput> {
  /** Stable identifier, also used to route the mock generator. */
  id: string;
  /** System instruction sent as the system role. */
  system: string;
  /** Builds the user message from typed input. */
  buildUser: (input: TInput) => string;
  /** Zod schema describing the expected input shape (defensive validation). */
  inputSchema: z.ZodType<TInput>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiProvider {
  readonly name: string;
  readonly modelId?: string;
  /** Set by provider after complete() when API returns usage. */
  lastUsage?: AiTokenUsage;
  complete(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string>;
}
