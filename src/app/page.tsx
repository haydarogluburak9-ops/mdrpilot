"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Stethoscope,
  FileStack,
  ListChecks,
  ShieldAlert,
  Gauge,
  Bot,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Activity,
  FileText,
  ClipboardList,
  Download,
  Languages,
  Globe,
  ClipboardCheck,
  Wrench,
  Workflow,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { ThemeToggle, LanguageSwitcher } from "@/components/layout/controls";
import { PLAN_CATALOG } from "@/lib/billing/plans";
import { PlanPriceBlock } from "@/components/billing/plan-price-block";
import { BillingPeriodToggle } from "@/components/billing/billing-period-toggle";
import type { BillingPeriod } from "@/components/billing/billing-period-toggle";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { BrandFooter } from "@/components/brand/brand-footer";
import { BRAND_NAME } from "@/lib/brand";
import { SalesRequestPanel, type SalesRequestKind } from "@/components/sales/sales-request-panel";
import { SupportContactForm } from "@/components/support/support-contact-form";
import type { PlanKey } from "@/lib/billing/plans";

export default function LandingPage() {
  const { t } = useI18n();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesKind, setSalesKind] = useState<SalesRequestKind>("purchase");
  const [salesPlan, setSalesPlan] = useState<PlanKey>("plus");

  function openSales(kind: SalesRequestKind, planKey: PlanKey) {
    setSalesKind(kind);
    setSalesPlan(planKey);
    setSalesOpen(true);
  }

  const featureItems = [
    { key: "techFile", icon: FileStack, featured: true },
    { key: "gspr", icon: ListChecks, featured: true },
    { key: "audit", icon: Gauge, featured: true },
    { key: "internalAudit", icon: ClipboardCheck, featured: false },
    { key: "calibration", icon: Wrench, featured: false },
    { key: "qualityOps", icon: Workflow, featured: false },
    { key: "ai", icon: Bot, featured: false },
    { key: "translator", icon: Languages, featured: false },
    { key: "languages", icon: Globe, featured: false },
    { key: "risk", icon: ShieldAlert, featured: false },
    { key: "qms", icon: Stethoscope, featured: false },
  ] as const;

  const features = featureItems.map((item) => ({
    ...item,
    tag: t(`landing.feature.${item.key}.tag`),
    title: t(`landing.feature.${item.key}.title`),
    desc: t(`landing.feature.${item.key}.desc`),
    highlights: [
      t(`landing.feature.${item.key}.h1`),
      t(`landing.feature.${item.key}.h2`),
      t(`landing.feature.${item.key}.h3`),
    ],
  }));

  const modules = [
    { key: "techFile", icon: FileStack },
    { key: "gspr", icon: ListChecks },
    { key: "risk", icon: ShieldAlert },
    { key: "clinical", icon: Stethoscope },
    { key: "pms", icon: Activity },
    { key: "ifu", icon: FileText },
    { key: "qms", icon: ClipboardList },
    { key: "translator", icon: Languages },
    { key: "languages", icon: Globe },
    { key: "export", icon: Download },
  ] as const;

  const heroStats = [
    t("landing.hero.stat1"),
    t("landing.hero.stat2"),
    t("landing.hero.stat3"),
    t("landing.hero.stat4"),
  ];

  const pricing = PLAN_CATALOG.map((p) => {
    const catalog = PLAN_CATALOG.find((x) => x.key === p.key)!;
    return {
      key: p.key,
      catalog,
      name: t(p.nameKey),
      highlight: p.key === "plus",
      features: p.featureKeys.map((f) => t(f)),
      cta:
        p.key === "enterprise"
          ? t("landing.plan.ent.cta")
          : p.key === "starter"
            ? t("landing.plan.starter.cta")
            : p.key === "basic"
              ? t("landing.plan.basic.cta")
              : p.key === "plus"
                ? t("landing.plan.plus.cta")
                : t("landing.plan.pro.cta"),
    };
  });

  const faqs = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
  ];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <BrandLockup size="md" href="/" variant="logo" priority />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#flow" className="hover:text-foreground">{t("landing.nav.demo")}</a>
            <a href="#features" className="hover:text-foreground">{t("landing.nav.features")}</a>
            <a href="#modules" className="hover:text-foreground">{t("landing.nav.modules")}</a>
            <a href="#pricing" className="hover:text-foreground">{t("landing.nav.pricing")}</a>
            <a href="#support" className="hover:text-foreground">{t("landing.nav.support")}</a>
            <a href="#faq" className="hover:text-foreground">{t("landing.nav.faq")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <a href="#pricing">
              <Button variant="outline">{t("landing.nav.signup")}</Button>
            </a>
            <Link href="/login"><Button>{t("landing.nav.signin")}</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient">
        <div className="container grid-pattern py-20 md:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="mb-5 border-primary/30 bg-primary/5 text-primary">
              {t("landing.hero.badge")}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">{t("landing.hero.title")}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {heroStats.map((stat) => (
                <span
                  key={stat}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {stat}
                </span>
              ))}
            </div>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/demo">
                <Button size="lg" className="gap-2">
                  {t("landing.bookdemo.button")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline">
                  {t("landing.hero.createAccount")}
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t("landing.hero.note")}</p>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="container py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h2 className="text-xl font-semibold">{t("landing.problem.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.problem.body")}</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8">
            <h2 className="text-xl font-semibold">{t("landing.solution.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.solution.body")}</p>
          </div>
        </div>
      </section>

      {/* Product demo flow */}
      <section id="flow" className="border-y border-border bg-muted/40">
        <div className="container py-16">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold">{t("landing.flow.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.flow.subtitle")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[t("landing.flow.s1"), t("landing.flow.s2"), t("landing.flow.s3"), t("landing.flow.s4")].map((s, i) => (
              <div key={s} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</div>
                <p className="mt-4 font-medium">{s}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/demo"><Button size="lg" className="gap-2">{t("landing.bookdemo.button")} <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border bg-muted/20">
        <div className="container py-20">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
              {t("landing.features.badge")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("landing.features.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("landing.features.subtitle")}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.key}
                className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-8 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <Badge variant="outline" className="mb-5 border-primary/20 bg-primary/5 text-xs font-medium text-primary">
                  {f.tag}
                </Badge>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                <ul className="mt-6 space-y-2.5 border-t border-border pt-6">
                  {f.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules band */}
      <section id="modules" className="container py-20">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
            {t("landing.modules.badge")}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("landing.modules.title")}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("landing.modules.subtitle")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div
              key={m.key}
              className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <m.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-[10px] font-medium uppercase tracking-wide">
                  {t(`landing.module.${m.key}.tag`)}
                </Badge>
              </div>
              <h3 className="font-semibold leading-snug">{t(`landing.module.${m.key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`landing.module.${m.key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Before / After */}
      <section className="container py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">{t("landing.beforeafter.title")}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
            <h3 className="text-lg font-semibold text-destructive">{t("landing.before.title")}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {t(`landing.before.${n}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-success/30 bg-success/5 p-8">
            <h3 className="text-lg font-semibold text-success">{t("landing.after.title")}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t(`landing.after.${n}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="container py-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold">{t("landing.usecases.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("landing.usecases.subtitle")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold">{t(`landing.usecase.${n}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`landing.usecase.${n}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container py-16">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-3xl font-bold">{t("landing.pricing.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("landing.pricing.subtitle")}</p>
          <div className="mt-6 flex justify-center">
            <BillingPeriodToggle
              value={billingPeriod}
              onChange={setBillingPeriod}
              monthlyLabel={t("billing.period.monthly")}
              annualLabel={t("billing.period.annual")}
              savingsHint={t("billing.period.annualHint")}
            />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {pricing.map((p) => (
            <div
              key={p.key}
              className={`rounded-2xl border bg-card p-8 ${p.highlight ? "border-primary shadow-lg ring-1 ring-primary/20" : "border-border"}`}
            >
              {p.highlight && <Badge className="mb-3">{t("landing.pricing.popular")}</Badge>}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <PlanPriceBlock plan={p.catalog} t={t} size="lg" billingPeriod={billingPeriod} />
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" /> {f}
                  </li>
                ))}
              </ul>
              {p.key === "starter" ? (
                <Link href="/register" className="mt-6 block">
                  <Button className="w-full" variant={p.highlight ? "default" : "outline"}>{p.cta}</Button>
                </Link>
              ) : (
                <div className="mt-6 space-y-2">
                  <Button
                    className="w-full"
                    variant={p.highlight ? "default" : "outline"}
                    onClick={() => openSales("purchase", p.key as PlanKey)}
                  >
                    {p.cta}
                  </Button>
                  {p.key === "pro" && (
                    <Button className="w-full" variant="outline" onClick={() => openSales("demo_trial", "pro")}>
                      {t("sales.demo.cta")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Support */}
      <section id="support" className="border-y border-border bg-muted/30">
        <div className="container py-16">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
                {t("landing.support.badge")}
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight">{t("landing.support.title")}</h2>
              <p className="mt-4 text-muted-foreground">{t("landing.support.subtitle")}</p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t("landing.support.point1")}
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t("landing.support.point2")}
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t("landing.support.point3")}
                </li>
              </ul>
              <p className="mt-6 text-sm text-muted-foreground">
                support@mdrpilot.com
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-semibold">{t("help.form.title")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("help.response")}</p>
              <SupportContactForm className="mt-5" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold">{t("landing.faq.title")}</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book demo CTA */}
      <section className="container pb-20">
        <div className="rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground">
          <h2 className="text-3xl font-bold">{t("landing.bookdemo.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">{t("landing.bookdemo.subtitle")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/demo">
              <Button
                size="lg"
                className="gap-2 bg-primary-foreground text-primary shadow-md hover:bg-primary-foreground/90"
              >
                {t("landing.bookdemo.button")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-primary-foreground/60 bg-transparent text-primary-foreground shadow-none hover:bg-primary-foreground/15"
              onClick={() => openSales("demo_trial", "pro")}
            >
              {t("sales.demo.cta")}
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <BrandFooter className="max-w-md" />
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {BRAND_NAME}. {t("landing.footer.rights")}</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/terms" className="hover:text-foreground">
                {t("legal.terms")}
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                {t("legal.privacy")}
              </Link>
              <Link href="/help" className="hover:text-foreground">
                {t("nav.help")}
              </Link>
            </div>
            <p className="text-xs">MDR 2017/745 · ISO 13485 · ISO 9001 · ISO 14971</p>
          </div>
        </div>
      </footer>

      <SalesRequestPanel
        open={salesOpen}
        onClose={() => setSalesOpen(false)}
        kind={salesKind}
        planKey={salesPlan}
        billingPeriod={billingPeriod}
      />
    </div>
  );
}
