import { describe, expect, it } from "vitest";
import {
  DEFAULT_VERIFICATION_TESTS,
  serializeVerificationTestsMarkdown,
  type VerificationTestRecord,
} from "@/lib/domain/verification-tests";

describe("verification tests markdown", () => {
  it("seeds sterile + software defaults", () => {
    const tests = DEFAULT_VERIFICATION_TESTS({ isSterile: true, containsSoftware: true });
    expect(tests.some((t) => t.category === "STERILIZATION")).toBe(true);
    expect(tests.some((t) => t.category === "SOFTWARE")).toBe(true);
  });

  it("renders quantitative columns when present", () => {
    const tests: VerificationTestRecord[] = [
      {
        id: "t1",
        category: "MECHANICAL",
        title: "Blade sharpness",
        standardRef: "ISO 7740",
        status: "PASS",
        acceptanceCriteria: "≥ 5 N",
        measuredValue: "5.4 N",
        units: "N",
        sampleSize: "n=10",
      },
    ];
    const md = serializeVerificationTestsMarkdown(tests, "en");
    expect(md).toContain("Blade sharpness");
    expect(md).toContain("5.4 N");
    expect(md).toContain("≥ 5 N");
    expect(md).toContain("|");
  });
});
