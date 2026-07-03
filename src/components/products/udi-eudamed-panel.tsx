"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { useI18n } from "@/components/providers/i18n-provider";

type UdiData = {
  basicUdiDi: string | null;
  udiDi: string | null;
  emdnCode: string | null;
  eudamedDeviceId: string | null;
  eudamedRegistrationStatus: string | null;
  srnNumber: string | null;
  udiPayload: string;
  eudamedReadiness: { score: number; missing: string[] };
};

export function UdiEudamedPanel({ productId, canEdit }: { productId: string; canEdit: boolean }) {
  const { t } = useI18n();
  const [data, setData] = useState<UdiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dmUrl, setDmUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/udi`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [productId]);

  async function save() {
    if (!data) return;
    setSaving(true);
    await fetch(`/api/products/${productId}/udi`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        basicUdiDi: data.basicUdiDi,
        udiDi: data.udiDi,
        emdnCode: data.emdnCode,
        eudamedDeviceId: data.eudamedDeviceId,
        eudamedRegistrationStatus: data.eudamedRegistrationStatus,
      }),
    });
    setSaving(false);
  }

  async function previewDataMatrix() {
    const res = await fetch(`/api/products/${productId}/udi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    setDmUrl(URL.createObjectURL(blob));
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const fields: (keyof UdiData)[] = [
    "basicUdiDi",
    "udiDi",
    "emdnCode",
    "eudamedDeviceId",
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t("udi.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("udi.desc")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((f) => (
            <div key={f}>
              <label className="text-xs text-muted-foreground">{t(`udi.${f}`)}</label>
              <input
                className="mt-1 w-full rounded-md border border-input px-3 py-1.5 text-sm"
                value={(data[f] as string) ?? ""}
                disabled={!canEdit}
                onChange={(e) => setData({ ...data, [f]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground">{t("udi.eudamedRegistrationStatus")}</label>
            <select
              className="mt-1 w-full rounded-md border border-input px-2 py-1.5 text-sm"
              value={data.eudamedRegistrationStatus ?? "NOT_REGISTERED"}
              disabled={!canEdit}
              onChange={(e) => setData({ ...data, eudamedRegistrationStatus: e.target.value })}
            >
              <option value="NOT_REGISTERED">{t("udi.status.NOT_REGISTERED")}</option>
              <option value="IN_PROGRESS">{t("udi.status.IN_PROGRESS")}</option>
              <option value="REGISTERED">{t("udi.status.REGISTERED")}</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            SRN: {data.srnNumber ?? "—"} · {t("udi.payload")}: <code>{data.udiPayload || "—"}</code>
          </p>
          {canEdit && (
            <Button size="sm" className="gap-1" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("common.save")}
            </Button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("udi.eudamedReadiness")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <ScoreRing score={data.eudamedReadiness.score} size={100} />
          {data.eudamedReadiness.missing.map((m) => (
            <Badge key={m} variant="warning">
              {t(`udi.missing.${m}`)}
            </Badge>
          ))}
          <Button variant="outline" size="sm" className="gap-1" onClick={previewDataMatrix}>
            <QrCode className="h-4 w-4" /> {t("udi.previewDataMatrix")}
          </Button>
          {dmUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dmUrl} alt="Data Matrix" className="border rounded p-2" width={120} height={120} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
