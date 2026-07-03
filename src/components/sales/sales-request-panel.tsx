"use client";

import { useEffect, useState } from "react";
import { X, Mail, Sparkles, CreditCard } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { PlanKey } from "@/lib/billing/plans";
import type { BillingPeriod } from "@/components/billing/billing-period-toggle";

export type SalesRequestKind = "purchase" | "demo_trial" | "token_pack";

export interface SalesRequestPanelProps {
  open: boolean;
  onClose: () => void;
  kind: SalesRequestKind;
  planKey?: PlanKey;
  billingPeriod?: BillingPeriod;
  tokenPackKey?: string;
  tokenPackLabel?: string;
  tokenPackPriceEur?: number;
}

export function SalesRequestPanel({
  open,
  onClose,
  kind,
  planKey = "pro",
  billingPeriod = "monthly",
  tokenPackKey,
  tokenPackLabel,
  tokenPackPriceEur,
}: SalesRequestPanelProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const planLabel = t(`plan.${planKey}`);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSent(false);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/sales/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        planKey,
        billingPeriod: kind === "purchase" ? billingPeriod : undefined,
        tokenPackKey: kind === "token_pack" ? tokenPackKey : undefined,
        name,
        email,
        company,
        phone: phone || undefined,
        notes: notes || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t("sales.form.error"));
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  const title =
    kind === "demo_trial"
      ? t("sales.demo.title")
      : kind === "token_pack"
        ? t("sales.tokenPack.title")
        : t("sales.purchase.title");
  const intro =
    kind === "demo_trial"
      ? t("sales.demo.intro").replace("{plan}", planLabel)
      : kind === "token_pack"
        ? t("sales.tokenPack.intro")
            .replace("{pack}", tokenPackLabel ?? tokenPackKey ?? "")
            .replace("{price}", tokenPackPriceEur != null ? `€${tokenPackPriceEur}` : "—")
        : t("sales.purchase.intro").replace("{plan}", planLabel);
  const autoNote =
    kind === "demo_trial"
      ? t("sales.demo.autoNote")
      : kind === "token_pack"
        ? t("sales.tokenPack.autoNote")
        : t("sales.purchase.autoNote");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sales-panel-title"
    >
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-primary/20 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {kind === "demo_trial" ? <Sparkles className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
              </div>
              <div>
                <h2 id="sales-panel-title" className="text-lg font-semibold">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("sales.panel.close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {sent ? (
            <div className="mt-6 rounded-xl border border-success/30 bg-success/5 p-5 text-center">
              <Mail className="mx-auto h-8 w-8 text-success" />
              <p className="mt-3 text-sm font-medium text-foreground">{t("sales.form.sent")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("sales.form.sentHint")}</p>
              <Button className="mt-4" onClick={onClose}>
                {t("sales.panel.close")}
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                {autoNote}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("sales.form.name")}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("sales.form.email")}</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("sales.form.company")}</label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("sales.form.phone")}</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("sales.form.notes")}</label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("sales.form.notesPlaceholder")}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                  <Mail className="h-4 w-4" />
                  {loading ? t("sales.form.submitting") : t("sales.form.submit")}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  {t("sales.panel.close")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
