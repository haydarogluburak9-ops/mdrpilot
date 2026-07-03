export { technicalFilePrompt } from "./technical-file.prompt";
export { gsprPrompt } from "./gspr.prompt";
export { riskPrompt } from "./risk.prompt";
export { ifuPrompt } from "./ifu.prompt";
export { cerPrompt } from "./cer.prompt";
export { pmsPrompt } from "./pms.prompt";
export { qmsPrompt } from "./qms.prompt";
export { auditReadinessPrompt } from "./audit-readiness.prompt";
export { fileAnalysisPrompt } from "./file-analysis.prompt";

import { technicalFilePrompt } from "./technical-file.prompt";
import { gsprPrompt } from "./gspr.prompt";
import { riskPrompt } from "./risk.prompt";
import { ifuPrompt } from "./ifu.prompt";
import { cerPrompt } from "./cer.prompt";
import { pmsPrompt } from "./pms.prompt";
import { qmsPrompt } from "./qms.prompt";
import { auditReadinessPrompt } from "./audit-readiness.prompt";
import { fileAnalysisPrompt } from "./file-analysis.prompt";

export const PROMPTS = {
  "technical-file": technicalFilePrompt,
  gspr: gsprPrompt,
  risk: riskPrompt,
  ifu: ifuPrompt,
  cer: cerPrompt,
  pms: pmsPrompt,
  qms: qmsPrompt,
  "audit-readiness": auditReadinessPrompt,
  "file-analysis": fileAnalysisPrompt,
} as const;

export type PromptId = keyof typeof PROMPTS;
