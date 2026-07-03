"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Link2, Loader2, Plus, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvidencePanel, type EvidenceFile, type FileOption } from "@/components/modules/evidence-panel";
import { useI18n } from "@/components/providers/i18n-provider";
import type {
  VerificationTestCategory,
  VerificationTestRecord,
  VerificationTestStatus,
} from "@/lib/domain/verification-tests";
import { Disclaimer } from "@/components/ui/disclaimer";

const STATUS_VARIANT: Record<VerificationTestStatus, "muted" | "warning" | "success" | "destructive" | "default"> = {
  PLANNED: "muted",
  IN_PROGRESS: "warning",
  PASS: "success",
  FAIL: "destructive",
  NA: "default",
};

export function VerificationTestsPanel({
  productId,
  initialTests,
  vvSectionId,
  evidence,
  fileOptions,
  recommendations,
  canEdit,
}: {
  productId: string;
  initialTests: VerificationTestRecord[];
  vvSectionId: string | null;
  evidence: Record<string, EvidenceFile[]>;
  fileOptions: FileOption[];
  recommendations: Record<string, string[]>;
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [tests, setTests] = useState<VerificationTestRecord[]>(initialTests);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTests(initialTests);
  }, [initialTests]);

  const updateTest = useCallback((id: string, patch: Partial<VerificationTestRecord>) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSaved(false);
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/verification-tests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tests }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("vv.saveError"));
        return;
      }
      setTests(data.tests);
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("vv.saveError"));
    } finally {
      setSaving(false);
    }
  }

  function addTest() {
    const id = `vv-custom-${Date.now()}`;
    setTests((prev) => [
      ...prev,
      {
        id,
        category: "OTHER" as VerificationTestCategory,
        title: lang === "tr" ? "Yeni doğrulama testi" : "New verification test",
        status: "PLANNED",
      },
    ]);
    setSaved(false);
  }

  const evidenceItems = vvSectionId
    ? [{ id: vvSectionId, label: t("vv.evidenceSection"), sublabel: t("tf.section.verification-validation") }]
    : [];

  const passCount = tests.filter((t) => t.status === "PASS" || t.status === "NA").length;

  return (
    <div className="space-y-4">
      <Disclaimer text={t("vv.disclaimer")} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              {t("vv.title")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{t("vv.desc")}</p>
          </div>
          <Badge variant={passCount === tests.length && tests.length > 0 ? "success" : "warning"}>
            {passCount}/{tests.length} {t("vv.completed")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.map((test) => (
            <div key={test.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                    value={test.title}
                    disabled={!canEdit}
                    onChange={(e) => updateTest(test.id, { title: e.target.value })}
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                      value={test.category}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateTest(test.id, { category: e.target.value as VerificationTestCategory })
                      }
                    >
                      {(
                        [
                          "BIOCOMPATIBILITY",
                          "STERILIZATION",
                          "PACKAGING",
                          "ELECTRICAL",
                          "MECHANICAL",
                          "SOFTWARE",
                          "CLINICAL",
                          "OTHER",
                        ] as VerificationTestCategory[]
                      ).map((c) => (
                        <option key={c} value={c}>
                          {t(`vv.category.${c}`)}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                      value={test.status}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateTest(test.id, { status: e.target.value as VerificationTestStatus })
                      }
                    >
                      {(["PLANNED", "IN_PROGRESS", "PASS", "FAIL", "NA"] as VerificationTestStatus[]).map(
                        (s) => (
                          <option key={s} value={s}>
                            {t(`vv.status.${s}`)}
                          </option>
                        ),
                      )}
                    </select>
                    <Badge variant={STATUS_VARIANT[test.status]}>{t(`vv.status.${test.status}`)}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  placeholder={t("vv.standardRef")}
                  value={test.standardRef ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => updateTest(test.id, { standardRef: e.target.value })}
                />
                <input
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  placeholder={t("vv.protocolRef")}
                  value={test.protocolRef ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => updateTest(test.id, { protocolRef: e.target.value })}
                />
              </div>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs min-h-[60px]"
                placeholder={t("vv.resultSummary")}
                value={test.resultSummary ?? ""}
                disabled={!canEdit}
                onChange={(e) => updateTest(test.id, { resultSummary: e.target.value })}
              />
            </div>
          ))}

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={addTest}>
                <Plus className="h-4 w-4" /> {t("vv.addTest")}
              </Button>
              <Button size="sm" className="gap-1" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("common.save")}
              </Button>
              {saved && <span className="text-xs text-green-600">{t("vv.saved")}</span>}
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {evidenceItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" />
              {t("vv.linkedEvidence")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EvidencePanel
              target="technical-file"
              items={evidenceItems}
              evidence={evidence}
              fileOptions={fileOptions}
              recommendations={recommendations}
              canEdit={canEdit}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {t("vv.fileCenterHint")}{" "}
              <Link href="/files" className="text-primary underline">
                {t("nav.files")}
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
