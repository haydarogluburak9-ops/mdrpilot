import { describe, expect, it } from "vitest";
import { mergeCerSections, type CerDraftSections } from "@/lib/domain/clinical-cer-builder";

describe("mergeCerSections", () => {
  it("overlays non-empty AI sections onto rule base", () => {
    const base = {
      plan: "rule plan",
      stateOfTheArt: "rule sota",
      equivalentDevices: "rule eq",
      literatureStrategy: "rule lit",
      clinicalDataSummary: "rule data",
      benefitRiskConclusion: "rule br",
      pmsPmcfInputs: "rule pms",
      report: "rule report",
    } as CerDraftSections;
    const merged = mergeCerSections(base, {
      plan: "AI expanded clinical evaluation plan with team and methods.",
      report: "",
    });
    expect(merged.plan).toContain("AI expanded");
    expect(merged.report).toBe("rule report");
    expect(merged.stateOfTheArt).toBe("rule sota");
  });
});
