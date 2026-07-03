"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { LANGS, type Lang } from "@/lib/i18n/locales";

export function QmsCreateProcedurePanel({ canEdit }: { canEdit: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aiLocale, setAiLocale] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  async function createProcedure() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/qms/procedures/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          userContext: prompt.trim(),
          locale: aiLocale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("eqms.create.failed"));
        return;
      }
      router.push(data.procedureHref as string);
      router.refresh();
    } catch {
      setError(t("eqms.create.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4 border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("eqms.create.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{t("eqms.create.desc")}</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("eqms.create.titlePlaceholder")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("eqms.create.promptPlaceholder")}
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground">{t("eqms.create.aiLang")}</label>
          <select
            value={aiLocale}
            onChange={(e) => setAiLocale(e.target.value as Lang)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={busy || !title.trim() || prompt.trim().length < 10}
          onClick={createProcedure}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {busy ? t("eqms.create.running") : t("eqms.create.btn")}
        </Button>
      </CardContent>
    </Card>
  );
}
