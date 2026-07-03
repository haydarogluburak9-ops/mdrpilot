"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/components/providers/i18n-provider";
import type { DocumentRegisterBundle, DocumentRegisterRow } from "@/lib/document-register/load-register";
import type { DocStatus } from "@/lib/domain/types";

function RegisterTable({ rows, emptyLabel }: { rows: DocumentRegisterRow[]; emptyLabel: string }) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">{t("docRegister.col.code")}</th>
            <th className="px-4 py-3 font-medium">{t("docRegister.col.document")}</th>
            <th className="px-4 py-3 font-medium">{t("docRegister.col.reference")}</th>
            <th className="px-4 py-3 font-medium">{t("docRegister.col.revision")}</th>
            <th className="px-4 py-3 font-medium">{t("docRegister.col.issueDate")}</th>
            <th className="px-4 py-3 font-medium">{t("docRegister.col.revisionDate")}</th>
            <th className="px-4 py-3 font-medium">{t("docRegister.col.status")}</th>
            <th className="px-4 py-3 font-medium">{t("docRegister.col.owner")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.code}-${r.title}`} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
              <td className="px-4 py-3 font-medium">{r.title}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.reference ?? "—"}</td>
              <td className="px-4 py-3 font-mono text-xs">{r.revision}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.issueDate ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.revisionDate ?? "—"}</td>
              <td className="px-4 py-3"><StatusBadge status={r.status as DocStatus} /></td>
              <td className="px-4 py-3 text-muted-foreground">{r.owner ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocumentRegisterView({
  data,
  products,
  selectedProductId,
}: {
  data: DocumentRegisterBundle;
  products: { id: string; name: string }[];
  selectedProductId?: string;
}) {
  const { t, lang } = useI18n();

  const productOptions = useMemo(
    () => products.map((p) => ({ id: p.id, name: p.name })),
    [products],
  );

  function downloadExcel(lang: string) {
    const q = new URLSearchParams({ lang });
    if (selectedProductId) q.set("productId", selectedProductId);
    const a = document.createElement("a");
    a.href = `/api/document-register/xlsx?${q.toString()}`;
    a.rel = "noopener";
    a.click();
  }

  function onProductChange(productId: string) {
    const url = productId ? `/document-register?productId=${productId}` : "/document-register";
    window.location.href = url;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("docRegister.title")}
        description={t("docRegister.desc")}
        actions={
          <DownloadSelectButton
            formatOptions={false}
            label={t("docRegister.downloadExcel")}
            dialogTitle={t("docRegister.downloadExcel")}
            onDownload={({ lang }) => downloadExcel(lang)}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium" htmlFor="doc-register-product">
          {t("docRegister.product")}
        </label>
        <select
          id="doc-register-product"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedProductId ?? ""}
          onChange={(e) => onProductChange(e.target.value)}
        >
          {productOptions.length === 0 ? (
            <option value="">{t("docRegister.noProduct")}</option>
          ) : (
            productOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))
          )}
        </select>
        {data.productName && (
          <span className="text-sm text-muted-foreground">
            {t("docRegister.productSelected")}: {data.productName}
          </span>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <h2 className="text-sm font-semibold">{t("docRegister.group.technicalFile")}</h2>
        </div>
        <RegisterTable rows={data.technicalFile} emptyLabel={t("docRegister.emptyTf")} />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <h2 className="text-sm font-semibold">{t("docRegister.group.iso13485")}</h2>
        </div>
        <RegisterTable rows={data.iso13485} emptyLabel={t("docRegister.emptyQms")} />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <h2 className="text-sm font-semibold">{t("docRegister.group.iso9001")}</h2>
        </div>
        <RegisterTable rows={data.iso9001} emptyLabel={t("docRegister.emptyQms")} />
      </Card>
    </div>
  );
}
