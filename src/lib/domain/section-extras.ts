import type { PmcfSurvey } from "@/lib/domain/pmcf-survey";
import {
  parseVerificationTests,
  type VerificationTestRecord,
} from "@/lib/domain/verification-tests";

export interface SectionExtras {
  pmcfSurvey?: PmcfSurvey;
  pmcfSurveyResults?: string;
  verificationTests?: VerificationTestRecord[];
}

function isPmcfSurvey(v: unknown): v is PmcfSurvey {
  if (!v || typeof v !== "object") return false;
  const s = v as PmcfSurvey;
  return (
    typeof s.intro === "string" &&
    Array.isArray(s.questions) &&
    s.questions.length > 0 &&
    s.questions.every((q) => typeof q.text === "string")
  );
}

export function parseSectionExtras(raw: unknown): SectionExtras {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const survey = o.pmcfSurvey;
  const results = o.pmcfSurveyResults;
  const tests = parseVerificationTests(o.verificationTests);
  return {
    pmcfSurvey: isPmcfSurvey(survey) ? survey : undefined,
    pmcfSurveyResults: typeof results === "string" ? results : undefined,
    verificationTests: tests.length > 0 ? tests : undefined,
  };
}

export function mergeSectionExtras(
  prev: SectionExtras | undefined,
  patch: Partial<SectionExtras>,
): SectionExtras {
  return {
    ...prev,
    ...patch,
    verificationTests: patch.verificationTests ?? prev?.verificationTests,
    pmcfSurvey: patch.pmcfSurvey ?? prev?.pmcfSurvey,
    pmcfSurveyResults: patch.pmcfSurveyResults ?? prev?.pmcfSurveyResults,
  };
}
