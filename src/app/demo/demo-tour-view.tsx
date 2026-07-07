"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Boxes, Sparkles, AlertTriangle, FolderUp, Link2, PenLine, ClipboardCheck, FileDown, LineChart,
  ArrowRight, CheckCircle2, Lightbulb, Target, Settings, BookMarked, Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { useI18n } from "@/components/providers/i18n-provider";
import { DossierChecklistPanel } from "@/components/workflow/dossier-checklist-panel";
import type { DossierWorkflowStep } from "@/lib/workflow/dossier-checklist";
import type { LucideIcon } from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
  expected: string;
  tip: string;
  href: string;
  cta: string;
}

export function DemoTourView({
  productId,
  productName,
  workflowSteps,
}: {
  productId: string | null;
  productName: string | null;
  workflowSteps: DossierWorkflowStep[];
}) {
  const { t } = useI18n();
  const [done, setDone] = useState<Record<number, boolean>>({});
  const productHref = productId ? `/products/${productId}` : "/products";

  const steps: Step[] = [
    {
      icon: Settings,
      title: t("demo.s0.title"),
      description: t("demo.s0.desc"),
      expected: t("demo.s0.expected"),
      tip: t("demo.s0.tip"),
      href: "/settings",
      cta: t("demo.s0.cta"),
    },
    {
      icon: BookMarked,
      title: t("demo.s0b.title"),
      description: t("demo.s0b.desc"),
      expected: t("demo.s0b.expected"),
      tip: t("demo.s0b.tip"),
      href: "/qms",
      cta: t("demo.s0b.cta"),
    },
    {
      icon: Wand2,
      title: t("demo.s0c.title"),
      description: t("demo.s0c.desc"),
      expected: t("demo.s0c.expected"),
      tip: t("demo.s0c.tip"),
      href: "/wizards/quality-manual",
      cta: t("demo.s0c.cta"),
    },
    {
      icon: Boxes,
      title: t("demo.s1.title"),
      description: `${t("demo.s1.descA")} ${productName ?? t("demo.demoDevice")} ${t("demo.s1.descB")}`,
      expected: t("demo.s1.expected"),
      tip: t("demo.s1.tip"),
      href: productHref,
      cta: t("demo.s1.cta"),
    },
    {
      icon: Sparkles,
      title: t("demo.s2.title"),
      description: t("demo.s2.desc"),
      expected: t("demo.s2.expected"),
      tip: t("demo.s2.tip"),
      href: "/consultant",
      cta: t("demo.s2.cta"),
    },
    {
      icon: AlertTriangle,
      title: t("demo.s3.title"),
      description: t("demo.s3.desc"),
      expected: t("demo.s3.expected"),
      tip: t("demo.s3.tip"),
      href: "/consultant",
      cta: t("demo.s3.cta"),
    },
    {
      icon: FolderUp,
      title: t("demo.s4.title"),
      description: t("demo.s4.desc"),
      expected: t("demo.s4.expected"),
      tip: t("demo.s4.tip"),
      href: "/files",
      cta: t("demo.s4.cta"),
    },
    {
      icon: Link2,
      title: t("demo.s5.title"),
      description: t("demo.s5.desc"),
      expected: t("demo.s5.expected"),
      tip: t("demo.s5.tip"),
      href: "/gspr",
      cta: t("demo.s5.cta"),
    },
    {
      icon: PenLine,
      title: t("demo.s6.title"),
      description: t("demo.s6.desc"),
      expected: t("demo.s6.expected"),
      tip: t("demo.s6.tip"),
      href: "/composer",
      cta: t("demo.s6.cta"),
    },
    {
      icon: ClipboardCheck,
      title: t("demo.s7.title"),
      description: t("demo.s7.desc"),
      expected: t("demo.s7.expected"),
      tip: t("demo.s7.tip"),
      href: "/audit-simulator",
      cta: t("demo.s7.cta"),
    },
    {
      icon: FileDown,
      title: t("demo.s8.title"),
      description: t("demo.s8.desc"),
      expected: t("demo.s8.expected"),
      tip: t("demo.s8.tip"),
      href: "/exports",
      cta: t("demo.s8.cta"),
    },
    {
      icon: LineChart,
      title: t("demo.s9.title"),
      description: t("demo.s9.desc"),
      expected: t("demo.s9.expected"),
      tip: t("demo.s9.tip"),
      href: "/executive",
      cta: t("demo.s9.cta"),
    },
  ];

  const completed = Object.values(done).filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title={t("demo.title")}
        description={t("demo.desc")}
        actions={<Badge variant={completed === steps.length ? "success" : "muted"}>{completed}/{steps.length} {t("demo.steps")}</Badge>}
      />

      <div id="dossier-checklist" className="mb-6 scroll-mt-4">
        <DossierChecklistPanel steps={workflowSteps} />
      </div>

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{t("demo.scenario")}: Yılmaz Bio Medikal · {productName ?? "EO Sterile Ophthalmic Cannula"}</p>
              <p className="text-sm text-muted-foreground">
                {t("demo.scenarioDesc")}
              </p>
            </div>
          </div>
          <Link href="/settings"><Button className="gap-2">{t("demo.start")} <ArrowRight className="h-4 w-4" /></Button></Link>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {steps.map((s, i) => (
          <Card key={s.title} className={done[i] ? "border-success/40" : undefined}>
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${done[i] ? "bg-success/15 text-success" : "bg-primary/10 text-primary"}`}>
                {done[i] ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> {t("demo.expectedOutput")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.expected}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><Lightbulb className="h-3.5 w-3.5 text-warning" /> {t("demo.demoTip")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.tip}</p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Link href={s.href}><Button className="w-full gap-2">{s.cta} <ArrowRight className="h-4 w-4" /></Button></Link>
                <Button variant="outline" onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}>
                  {done[i] ? t("demo.markUndone") : t("demo.markDone")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Disclaimer variant="info" className="mt-6" />
    </div>
  );
}
