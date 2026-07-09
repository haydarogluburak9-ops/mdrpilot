"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Save, QrCode, Upload, Download, ExternalLink, CheckCircle2, Circle } from "lucide-react";
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

type ImportedDevice = {
  tradeName: string | null;
  basicUdiDi: string | null;
  udiDi: string | null;
  emdnCode: string | null;
  eudamedDeviceId: string | null;
  deviceClass: string | null;
  gmdn: string | null;
  issuingAgency: string | null;
  manufacturerName: string | null;
  srnNumber: string | null;
};

const EUDAMED_PORTAL = "https://ec.europa.eu/tools/eudamed/";
const EUDAMED_HELP = "https://webgate.ec.europa.eu/eudamed-help/en/";
const EUDAMED_M2M_GUIDE = "https://webgate.ec.europa.eu/eudamed-help/en/files/M2M%20-%20user%20guide.pdf";
const GS1_UDI = "https://www.gs1.org/standards/gs1-udi";

export function UdiEudamedPanel({ productId, canEdit }: { productId: string; canEdit: boolean }) {
  const { t } = useI18n();
  const [data, setData] = useState<UdiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dmUrl, setDmUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"xml" | "csv" | null>(null);
  const [importing, setImporting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [importDevices, setImportDevices] = useState<ImportedDevice[] | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [markRegistered, setMarkRegistered] = useState(true);
  const [updateCompanySrn, setUpdateCompanySrn] = useState(true);
  const [createMissingProducts, setCreateMissingProducts] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function downloadExport(type: "udi-xml" | "udi-csv") {
    setExporting(type === "udi-xml" ? "xml" : "csv");
    try {
      const res = await fetch(`/api/eudamed/export?type=${type}&productId=${encodeURIComponent(productId)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^"]+)"?/i.exec(cd);
      const filename = match?.[1] ?? (type === "udi-xml" ? `udi-${productId}.xml` : `udi-${productId}.csv`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  async function onImportFile(file: File) {
    setImporting(true);
    setImportMessage(null);
    setImportDevices(null);
    setImportWarnings([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/eudamed/import", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setImportMessage(json.error ?? t("udi.import.error"));
        setImportWarnings(json.warnings ?? []);
        return;
      }
      setImportDevices(json.devices ?? []);
      setImportWarnings(json.warnings ?? []);
      setSelectedIndex(0);
      setCreateMissingProducts((json.devices?.length ?? 0) > 1);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function applyImport() {
    if (!importDevices?.length || !data) return;
    setApplying(true);
    setImportMessage(null);
    try {
      const res = await fetch("/api/eudamed/import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          deviceIndex: selectedIndex,
          markRegistered,
          updateCompanySrn,
          createMissingProducts,
          devices: importDevices,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setImportMessage(json.error ?? t("udi.import.error"));
        return;
      }
      setData({
        ...data,
        ...json.product,
        srnNumber: json.srnNumber ?? data.srnNumber,
        udiPayload: json.udiPayload ?? data.udiPayload,
        eudamedReadiness: json.eudamedReadiness ?? data.eudamedReadiness,
      });
      const created = json.createdProductIds?.length ?? 0;
      setImportMessage(
        created > 0
          ? t("udi.import.appliedWithCreate").replace("{n}", String(created))
          : t("udi.import.applied"),
      );
      setImportDevices(null);
    } finally {
      setApplying(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const fields: (keyof UdiData)[] = ["basicUdiDi", "udiDi", "emdnCode", "eudamedDeviceId"];
  const checklist = [
    { key: "basicUdiDi", ok: Boolean(data.basicUdiDi?.trim()) },
    { key: "udiDi", ok: Boolean(data.udiDi?.trim()) },
    { key: "emdnCode", ok: Boolean(data.emdnCode?.trim()) },
    { key: "srnNumber", ok: Boolean(data.srnNumber?.trim()) },
  ] as const;
  const canExport = checklist.every((c) => c.ok);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t("udi.title")}</CardTitle>
            <Badge variant="secondary">{t("udi.badge.free")}</Badge>
          </div>
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

      {/* Free: prepare package + upload guide */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{t("udi.free.title")}</CardTitle>
            <Badge variant="secondary">{t("udi.badge.free")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("udi.free.desc")}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">{t("udi.free.checklistTitle")}</p>
            <ul className="space-y-1.5">
              {checklist.map((c) => (
                <li key={c.key} className="flex items-center gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={c.ok ? "" : "text-muted-foreground"}>
                    {t(`udi.free.check.${c.key}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1"
              disabled={!canExport || exporting !== null}
              onClick={() => void downloadExport("udi-xml")}
            >
              {exporting === "xml" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("udi.free.exportXml")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={!canExport || exporting !== null}
              onClick={() => void downloadExport("udi-csv")}
            >
              {exporting === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("udi.free.exportCsv")}
            </Button>
            <a
              href={EUDAMED_PORTAL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" /> {t("udi.free.openEudamed")}
            </a>
          </div>
          {!canExport && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{t("udi.free.exportBlocked")}</p>
          )}

          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>{t("udi.free.step1")}</li>
            <li>{t("udi.free.step2")}</li>
            <li>{t("udi.free.step3")}</li>
            <li>{t("udi.free.step4")}</li>
            <li>{t("udi.free.step5")}</li>
          </ol>
        </CardContent>
      </Card>

      {/* Free: import existing registration */}
      {canEdit && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{t("udi.import.title")}</CardTitle>
              <Badge variant="secondary">{t("udi.badge.free")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t("udi.import.desc")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xml,.csv,text/xml,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportFile(f);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={importing}
                onClick={() => fileRef.current?.click()}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t("udi.import.upload")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("udi.import.formats")}</span>
            </div>

            {importWarnings.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-amber-700 dark:text-amber-400">
                {importWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}

            {importMessage && <p className="text-sm text-muted-foreground">{importMessage}</p>}

            {importDevices && importDevices.length > 0 && (
              <div className="space-y-3 rounded-md border border-border p-3">
                <p className="text-sm font-medium">
                  {t("udi.import.found").replace("{n}", String(importDevices.length))}
                </p>
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-1 pr-2" />
                        <th className="py-1 pr-2">{t("udi.import.col.name")}</th>
                        <th className="py-1 pr-2">{t("udi.udiDi")}</th>
                        <th className="py-1 pr-2">{t("udi.basicUdiDi")}</th>
                        <th className="py-1">{t("udi.emdnCode")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importDevices.map((d, i) => (
                        <tr key={i} className="border-b border-border/60">
                          <td className="py-1 pr-2">
                            <input
                              type="radio"
                              name="udi-import-device"
                              checked={selectedIndex === i}
                              onChange={() => setSelectedIndex(i)}
                            />
                          </td>
                          <td className="py-1 pr-2">{d.tradeName ?? "—"}</td>
                          <td className="py-1 pr-2 font-mono">{d.udiDi ?? "—"}</td>
                          <td className="py-1 pr-2 font-mono">{d.basicUdiDi ?? "—"}</td>
                          <td className="py-1">{d.emdnCode ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={markRegistered}
                    onChange={(e) => setMarkRegistered(e.target.checked)}
                  />
                  {t("udi.import.markRegistered")}
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={updateCompanySrn}
                    onChange={(e) => setUpdateCompanySrn(e.target.checked)}
                    disabled={!importDevices[selectedIndex]?.srnNumber}
                  />
                  {t("udi.import.updateSrn")}
                  {importDevices[selectedIndex]?.srnNumber
                    ? ` (${importDevices[selectedIndex].srnNumber})`
                    : ""}
                </label>
                {importDevices.length > 1 && (
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={createMissingProducts}
                      onChange={(e) => setCreateMissingProducts(e.target.checked)}
                    />
                    {t("udi.import.createOthers")}
                  </label>
                )}
                <Button size="sm" onClick={applyImport} disabled={applying}>
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("udi.import.apply")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paid / external: guidance only */}
      <Card className="lg:col-span-3 border-dashed">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{t("udi.paid.title")}</CardTitle>
            <Badge variant="outline">{t("udi.badge.guide")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("udi.paid.desc")}</p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-sm font-medium">{t("udi.paid.gs1.title")}</p>
            <p className="text-xs text-muted-foreground">{t("udi.paid.gs1.body")}</p>
            <p className="text-xs text-muted-foreground">{t("udi.paid.gs1.cost")}</p>
            <a
              href={GS1_UDI}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" /> {t("udi.paid.gs1.link")}
            </a>
          </div>
          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-sm font-medium">{t("udi.paid.m2m.title")}</p>
            <p className="text-xs text-muted-foreground">{t("udi.paid.m2m.body")}</p>
            <p className="text-xs text-muted-foreground">{t("udi.paid.m2m.cost")}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={EUDAMED_M2M_GUIDE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" /> {t("udi.paid.m2m.link")}
              </a>
              <a
                href={EUDAMED_HELP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-medium hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" /> {t("udi.paid.help")}
              </a>
            </div>
          </div>
          <p className="md:col-span-2 text-xs text-muted-foreground">{t("udi.paid.note")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
