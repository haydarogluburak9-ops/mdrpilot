import { z } from "zod";
import type { PromptDefinition } from "../types";
import { changeControlProcedureGuidance, isChangeControlQmsDoc } from "@/lib/qms/change-control-guidance";
import {
  organizationProcedureGuidance,
  isOrganizationQmsDoc,
} from "@/lib/qms/organization-procedure-guidance";
import {
  childDocumentPromptGuidance,
  isChildQmsDocument,
} from "@/lib/qms/child-document-prompt-guidance";
import { inferQmsLayerFromCode } from "@/lib/qms/kys-structure";
import { REGULATORY_GUARDRAILS, jsonOutputReminder } from "./shared";

const qmsInputSchema = z.object({
  documentTitle: z.string(),
  standard: z.string(),
  clauseRefs: z.string().optional(),
  documentCode: z.string().optional(),
  documentLayer: z.string().optional(),
  companyName: z.string().optional(),
  context: z.string().optional(),
  _locale: z.enum(["tr", "en"]).optional(),
});
export type QmsInput = z.infer<typeof qmsInputSchema>;

function buildUserMessage(input: QmsInput): string {
  const tr = input._locale === "tr";
  const locale = tr ? "tr" : "en";
  const changeControl = isChangeControlQmsDoc(input.documentCode, input.documentTitle);
  const changeControlNote = changeControl ? changeControlProcedureGuidance(locale) : "";
  const organization = isOrganizationQmsDoc(input.documentCode, input.documentTitle);
  const organizationNote = organization ? organizationProcedureGuidance(locale) : "";
  const childDoc = isChildQmsDocument(input.documentCode, input.documentLayer);
  const childNote = childDoc
    ? childDocumentPromptGuidance(input.documentCode, input.documentLayer, locale)
    : "";

  const structureLines = childDoc
    ? tr
      ? [
          "KYS alt doküman taslağını oluştur.",
          childNote,
          "Ana bölümler için ## markdown başlık kullan.",
        ]
      : [
          "Draft the QMS child document content.",
          childNote,
          "Use ## markdown for main sections.",
        ]
    : tr
      ? [
          "KYS prosedür taslağını oluştur.",
          "Yapı: Amaç, Kapsam, Sorumluluklar, Tanımlar, Prosedür, Kayıtlar, Referanslar, Revizyon geçmişi.",
          "Prosedür alt adımları için tutarlı numaralandırma kullan: ## 5. Prosedür altında ### 5.1, ### 5.2 …; alt maddeler 5.1.1, 5.2.1 şeklinde. Paralel 1./2./3. ve 2.1/4.1 karışık numaralandırma YAPMA.",
        ]
      : [
          "Draft the QMS document content.",
          "Use: Purpose, Scope, Responsibilities, Definitions, Procedure, Records, References, Revision history.",
          "Use ## markdown for main sections. Under ## 5. Procedure use ### 5.1, ### 5.2 …; sub-steps as 5.1.1, 5.2.1. Do NOT mix parallel 1./2./3. headings with 2.1/4.1 numbering.",
        ];

  const lines = tr
    ? [
        `Standart: ${input.standard}`,
        `Doküman: ${input.documentTitle}`,
        input.documentCode ? `Kod: ${input.documentCode}` : "",
        input.documentLayer ? `Katman: ${input.documentLayer}` : input.documentCode ? `Katman: ${inferQmsLayerFromCode(input.documentCode)}` : "",
        input.clauseRefs ? `Maddeler: ${input.clauseRefs}` : "",
        input.companyName ? `Şirket: ${input.companyName}` : "",
        input.context ? `Bağlam: ${input.context}` : "",
        changeControlNote,
        organizationNote,
        "",
        ...structureLines,
        "data.document.sections içindeki tüm başlık ve gövde metinleri Türkçe olmalı.",
        jsonOutputReminder(
          '{ "document": { "sections": [{ "heading": string, "body": string }] } } — "data" alanı altında',
        ),
      ]
    : [
        `Standard: ${input.standard}`,
        `Document: ${input.documentTitle}`,
        input.documentCode ? `Code: ${input.documentCode}` : "",
        input.documentLayer ? `Layer: ${input.documentLayer}` : input.documentCode ? `Layer: ${inferQmsLayerFromCode(input.documentCode)}` : "",
        input.clauseRefs ? `Clauses: ${input.clauseRefs}` : "",
        input.companyName ? `Company: ${input.companyName}` : "",
        input.context ? `Context: ${input.context}` : "",
        changeControlNote,
        organizationNote,
        "",
        ...structureLines,
        jsonOutputReminder(
          '{ "document": { "sections": [{ "heading": string, "body": string }] } } — place under the optional "data" field',
        ),
      ];
  return lines.filter(Boolean).join("\n");
}
export const qmsPrompt: PromptDefinition<QmsInput> = {
  id: "qms",
  inputSchema: qmsInputSchema,
  system: `${REGULATORY_GUARDRAILS}

Task: Draft a QMS document aligned to the referenced standard clauses.
For procedures (SOP): use professional SOP structure.
For child documents (forms, work instructions, diagrams, lists, records): follow the document-type instructions — do NOT default to SOP sections.
Keep content generic and editable.`,
  buildUser: buildUserMessage,
};
