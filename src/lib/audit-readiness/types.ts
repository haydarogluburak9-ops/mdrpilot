export type AuditGapSeverity = "major" | "minor" | "observation";
export type AuditGapCategory = "qms" | "mdr" | "operational" | "evidence";

export interface AuditGap {
  id: string;
  category: AuditGapCategory;
  severity: AuditGapSeverity;
  standardCode: string;
  clauseRef: string;
  titleTr: string;
  titleEn: string;
  messageTr: string;
  messageEn: string;
  actionHref?: string;
  actionLabelTr?: string;
  actionLabelEn?: string;
  productId?: string;
  productName?: string;
}

export interface AuditReadinessSummary {
  qmsScore: number;
  mdrScore: number;
  overallScore: number;
  majorCount: number;
  minorCount: number;
  observationCount: number;
  gaps: AuditGap[];
  qmsApproved: number;
  qmsTotal: number;
  contentScorePercent: number;
}
