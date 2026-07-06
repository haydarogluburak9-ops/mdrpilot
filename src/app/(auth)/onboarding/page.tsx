"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [srn, setSrn] = useState("");
  const [notifiedBody, setNotifiedBody] = useState("");
  const [industry, setIndustry] = useState<"MEDICAL" | "FOOD" | "PHARMA" | "OTHER">("MEDICAL");
  const [standards, setStandards] = useState<string[]>(["MDR", "ISO 13485"]);
  const [productCount, setProductCount] = useState("");
  const [goal, setGoal] = useState<"GENERATE" | "GAPS" | "AUDIT">("GAPS");

  function toggleStandard(s: string) {
    setStandards((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName, country, srn, notifiedBody,
          industry, standards,
          productCount: productCount ? Number(productCount) : undefined,
          goal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("auth.onboarding.failed"));
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("auth.networkError"));
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("auth.onboarding.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.onboarding.subtitle")}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("auth.onboarding.company")}</label>
          <Input placeholder="Acme Medical Ltd." value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("auth.onboarding.country")}</label>
            <Input placeholder="Germany" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("auth.onboarding.srn")}</label>
            <Input placeholder="DE-MF-000000000" value={srn} onChange={(e) => setSrn(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("auth.onboarding.nb")}</label>
          <Input placeholder="e.g. TÜV SÜD (0123)" value={notifiedBody} onChange={(e) => setNotifiedBody(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("auth.onboarding.industry")}</label>
          <div className="grid grid-cols-4 gap-2">
            {(["MEDICAL", "FOOD", "PHARMA", "OTHER"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setIndustry(opt)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${industry === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {t(`auth.onboarding.industry.${opt.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("auth.onboarding.standards")}</label>
          <div className="flex flex-wrap gap-2">
            {["MDR", "ISO 13485"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStandard(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${standards.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("auth.onboarding.productCount")}</label>
            <Input type="number" min={0} placeholder="3" value={productCount} onChange={(e) => setProductCount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("auth.onboarding.goal")}</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as typeof goal)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="GENERATE">{t("auth.onboarding.goal.generate")}</option>
              <option value="GAPS">{t("auth.onboarding.goal.gaps")}</option>
              <option value="AUDIT">{t("auth.onboarding.goal.audit")}</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("auth.onboarding.submitting") : t("auth.onboarding.submit")}
        </Button>
      </form>
    </div>
  );
}
