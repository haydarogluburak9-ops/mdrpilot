"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";

const FIELDS = [
  "threatModel",
  "sbomReference",
  "vulnerabilityProcess",
  "securityTesting",
  "patchManagement",
  "clinicalSafetyImpact",
] as const;

type CyberData = Record<(typeof FIELDS)[number], string | null>;

export function CyberSecurityPanel({ productId, canEdit }: { productId: string; canEdit: boolean }) {
  const { t, lang } = useI18n();
  const [data, setData] = useState<CyberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${productId}/cybersecurity?locale=${lang}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [productId, lang]);

  async function save() {
    if (!data) return;
    setSaving(true);
    await fetch(`/api/products/${productId}/cybersecurity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("cyber.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("cyber.desc")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map((field) => (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground">{t(`cyber.${field}`)}</label>
            <textarea
              className="mt-1 w-full min-h-[72px] rounded-md border border-input px-3 py-2 text-xs"
              value={data[field] ?? ""}
              disabled={!canEdit}
              onChange={(e) => setData({ ...data, [field]: e.target.value })}
            />
          </div>
        ))}
        {canEdit && (
          <Button size="sm" className="gap-1" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("common.save")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
