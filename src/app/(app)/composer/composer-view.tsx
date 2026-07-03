"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, Plus, Loader2, FileText, AlertCircle, X } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Disclaimer } from "@/components/ui/disclaimer";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { COMPOSER_TYPES, COMPOSER_TYPE_LABEL } from "@/lib/composer/types";

interface ComposerItem {
  id: string; title: string; type: string; status: string; version: number; aiConfidence: number;
  productId: string | null; productName: string | null; createdBy: string | null; updatedAt: string;
}
interface ProductLite { id: string; name: string; }

function statusBadge(s: string, t: (k: string) => string) {
  const map: Record<string, "muted" | "warning" | "success" | "destructive" | "secondary"> = {
    DRAFT: "muted", IN_REVIEW: "warning", APPROVED: "success", REJECTED: "destructive", ARCHIVED: "secondary",
  };
  return <Badge variant={map[s] ?? "muted"}>{t(`composerStatus.${s}`)}</Badge>;
}

export function ComposerView({
  initialDocuments, products, canCreate,
}: { initialDocuments: ComposerItem[]; products: ProductLite[]; canCreate: boolean; }) {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const [documents] = useState<ComposerItem[]>(initialDocuments);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title={t("composer.title")}
        description={t("composer.desc")}
        actions={canCreate ? <Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("composer.create")}</Button> : undefined}
      />

      <Disclaimer className="mb-4" text={t("composer.listDisclaimer")} />

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title={t("composer.empty.title")} description={t("composer.empty.desc")} />
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/composer/${d.id}`} className="truncate text-sm font-medium hover:underline">{d.title}</Link>
                    {statusBadge(d.status, t)}
                    <Badge variant="outline">v{d.version}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {COMPOSER_TYPE_LABEL[d.type as keyof typeof COMPOSER_TYPE_LABEL] ?? d.type}
                    {d.productName ? ` · ${d.productName}` : ""} · {new Date(d.updatedAt).toLocaleDateString()}{d.createdBy ? ` · ${d.createdBy}` : ""} · AI {Math.round(d.aiConfidence * 100)}%
                  </p>
                </div>
                <Link href={`/composer/${d.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("common.open")}</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <CreateModal
          products={products}
          defaultProductId={search.get("productId") ?? ""}
          onClose={() => setOpen(false)}
          onCreated={(id) => router.push(`/composer/${id}`)}
        />
      )}
    </div>
  );
}

function CreateModal({
  products, defaultProductId, onClose, onCreated,
}: { products: ProductLite[]; defaultProductId: string; onClose: () => void; onCreated: (id: string) => void; }) {
  const { t } = useI18n();
  const [productId, setProductId] = useState(defaultProductId);
  const [type, setType] = useState<string>(COMPOSER_TYPES[0].value);
  const [language, setLanguage] = useState<"en" | "tr">("en");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/composer/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productId || undefined, type, language, title: title || undefined, instructions: instructions || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("composer.failedGenerate")); return; }
      onCreated(data.document.id);
    } catch { setError(t("composer.networkError")); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-4 w-4 text-accent" /> {t("composer.generateDoc")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("composer.docType")}</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm">
              {COMPOSER_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label} — {ct.standard}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">{t("files.product")}</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm">
                <option value="">{t("composer.noneCompany")}</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm font-medium">{t("lang.switch")}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "tr")} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm">
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("composer.titleOptional")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder={t("composer.autoGen")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("composer.extraInstr")}</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder={t("composer.instrPlaceholder")} />
          </div>
          {error && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</p>}
          {loading && <AiAnalyzingHint />}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>{t("common.cancel")}</Button>
            <Button className="gap-1.5" onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {t("composer.generateBtn")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
