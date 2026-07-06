"use client";

import { useRef, useState, useEffect } from "react";
import { ImageIcon, Loader2, Trash2, Upload, AlertCircle, CheckCircle2, Save, Search } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { companyProfileCompleteness } from "@/lib/wizards/quality-manual/company-profile-sync";
import {
  type QmsOnboardingPath,
  qmsPathNextStepKey,
} from "@/lib/qms/onboarding-path";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamPanel } from "@/components/settings/team-panel";
import { AccountSecurityPanel } from "@/components/settings/account-security-panel";
import { TwoFactorPanel } from "@/components/settings/two-factor-panel";
import { PrivacyDataPanel } from "@/components/settings/privacy-data-panel";
import { NOTIFIED_BODIES } from "@/lib/domain/notified-bodies";

interface CompanyProfile {
  name: string;
  legalName: string | null;
  country: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  manufacturingSites: string | null;
  authorizedRep: string | null;
  srnNumber: string | null;
  notifiedBody: string | null;
  notifiedBodyNumber: string | null;
  hasLogo: boolean;
}

export function SettingsView({
  company,
  members,
  currentRole,
  canEditBranding,
  canManageTeam,
  qmsPath,
  qmsStats,
  aiProvider,
  aiModel,
  aiConfigured,
}: {
  company: CompanyProfile;
  members: { name: string; role: string }[];
  currentRole: string;
  canEditBranding: boolean;
  canManageTeam: boolean;
  qmsPath: QmsOnboardingPath | null;
  qmsStats: { total: number; withContent: number };
  aiProvider: string;
  aiModel: string;
  aiConfigured: boolean;
}) {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("settings.title")} description={t("settings.desc")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Phase0Card
          company={company}
          qmsPath={qmsPath}
          qmsStats={qmsStats}
          canEditPath={canEditBranding}
        />
        <LogoCard hasLogo={company.hasLogo} canEdit={canEditBranding} />
        <CompanyProfileCard company={company} canEdit={canEditBranding} />

        <TeamPanel canManage={canManageTeam} />

        <AccountSecurityPanel />
        <TwoFactorPanel />
        <PrivacyDataPanel isOwner={currentRole === "OWNER"} />

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("settings.aiConfig")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("settings.aiConfigDescA")}{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AI_PROVIDER=openai</code> {t("settings.aiConfigAnd")}{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AI_API_KEY</code> {t("settings.aiConfigDescB")}{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code>. {t("settings.aiConfigDescC")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("settings.provider")}</label>
                <Input value={aiProvider} disabled readOnly />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("settings.model")}</label>
                <Input value={aiModel} disabled readOnly />
              </div>
            </div>
            <Badge variant={aiConfigured ? "success" : "warning"}>
              {aiConfigured ? t("settings.aiLive") : t("settings.serverManaged")}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Phase0Card({
  company,
  qmsPath,
  qmsStats,
  canEditPath,
}: {
  company: CompanyProfile;
  qmsPath: QmsOnboardingPath | null;
  qmsStats: { total: number; withContent: number };
  canEditPath: boolean;
}) {
  const { t } = useI18n();
  const [path, setPath] = useState<QmsOnboardingPath | null>(qmsPath);
  const [pathSaving, setPathSaving] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);

  const { percent, items } = companyProfileCompleteness({
    name: company.name,
    legalName: company.legalName,
    country: company.country,
    address: company.address,
    manufacturingSites: company.manufacturingSites,
    authorizedRep: company.authorizedRep,
    srnNumber: company.srnNumber,
    notifiedBody: company.notifiedBody,
    notifiedBodyNumber: company.notifiedBodyNumber,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
  });

  async function savePath(next: QmsOnboardingPath) {
    if (!canEditPath) return;
    setPath(next);
    setPathSaving(true);
    setPathError(null);
    try {
      const res = await fetch("/api/settings/qms-path", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qmsPath: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPathError(data.error ?? t("settings.phase0.pathError"));
        setPath(qmsPath);
      }
    } catch {
      setPathError(t("settings.phase0.pathError"));
      setPath(qmsPath);
    } finally {
      setPathSaving(false);
    }
  }

  const nextHref = path === "IMPORTED" ? "/qms" : path === "GREENFIELD" ? "/wizards/quality-manual" : null;

  return (
    <Card className="lg:col-span-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("settings.phase0.title")}</CardTitle>
          <Badge variant={percent >= 80 ? "success" : percent >= 50 ? "warning" : "secondary"}>
            {percent}% — {t("settings.phase0.complete")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("settings.phase0.desc")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("settings.phase0.pathTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("settings.phase0.pathDesc")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["GREENFIELD", "IMPORTED"] as QmsOnboardingPath[]).map((p) => (
              <button
                key={p}
                type="button"
                disabled={!canEditPath || pathSaving}
                onClick={() => savePath(p)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  path === p
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                } ${!canEditPath ? "cursor-default" : ""}`}
              >
                <p className="font-medium">{t(`settings.phase0.path.${p}`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t(`settings.phase0.path.${p}.desc`)}</p>
              </button>
            ))}
          </div>
          {pathSaving && <p className="text-xs text-muted-foreground">{t("settings.phase0.pathSaving")}</p>}
          {pathError && <p className="text-xs text-destructive">{pathError}</p>}
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              )}
              <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                {t(item.labelKey)}
              </span>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-border bg-card/80 p-3 text-sm">
          <p className="font-medium">{t("settings.phase0.kysStats")}</p>
          <p className="text-muted-foreground">
            {qmsStats.withContent} / {qmsStats.total} {t("settings.phase0.kysWithContent")}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{t("settings.phase0.isoHint")}</p>
        </div>

        {percent < 100 && (
          <p className="text-sm text-muted-foreground">{t("settings.phase0.hint")}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">{t(qmsPathNextStepKey(path))}</p>
          {nextHref && (
            <Link href={nextHref} className="text-sm font-medium text-primary hover:underline">
              {path === "IMPORTED" ? t("settings.phase0.goImport") : t("settings.phase0.goGreenfield")}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyProfileCard({ company, canEdit }: { company: CompanyProfile; canEdit: boolean }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: company.name ?? "",
    legalName: company.legalName ?? "",
    country: company.country ?? "",
    address: company.address ?? "",
    contactEmail: company.contactEmail ?? "",
    contactPhone: company.contactPhone ?? "",
    manufacturingSites: company.manufacturingSites ?? "",
    authorizedRep: company.authorizedRep ?? "",
    srnNumber: company.srnNumber ?? "",
    notifiedBody: company.notifiedBody ?? "",
    notifiedBodyNumber: company.notifiedBodyNumber ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nbQuery, setNbQuery] = useState("");
  const [nbOpen, setNbOpen] = useState(false);

  const nbMatches = nbQuery.trim()
    ? NOTIFIED_BODIES.filter((nb) => {
        const q = nbQuery.toLowerCase();
        return (
          nb.name.toLowerCase().includes(q) ||
          nb.number.includes(q.replace(/^0+/, "")) ||
          nb.number.includes(q) ||
          nb.country.toLowerCase().includes(q) ||
          nb.regulations.some((r) => r.toLowerCase().includes(q))
        );
      }).slice(0, 12)
    : NOTIFIED_BODIES.slice(0, 12);

  function pickNb(nb: { number: string; name: string }) {
    setForm((f) => ({ ...f, notifiedBody: nb.name, notifiedBodyNumber: nb.number }));
    setNbQuery("");
    setNbOpen(false);
    setSaved(false);
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    if (!form.name.trim()) {
      setError(t("settings.companyNameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("settings.companySaveError"));
        return;
      }
      setSaved(true);
    } catch {
      setError(t("settings.companySaveError"));
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof form, labelKey: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{t(labelKey)}</label>
      <Input value={form[key]} onChange={(e) => set(key, e.target.value)} disabled={!canEdit} placeholder={placeholder} />
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle>{t("settings.companyProfile")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t("settings.companyProfileHint")}</p>
        {field("name", "settings.companyName")}
        {field("legalName", "settings.legalName")}
        <div className="grid grid-cols-2 gap-3">
          {field("country", "settings.country")}
          {field("srnNumber", "settings.srnNumber")}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("settings.address")}</label>
          <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} disabled={!canEdit} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field("contactEmail", "settings.contactEmail")}
          {field("contactPhone", "settings.contactPhone")}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("settings.manufacturingSites")}</label>
          <Textarea value={form.manufacturingSites} onChange={(e) => set("manufacturingSites", e.target.value)} disabled={!canEdit} rows={2} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("settings.authorizedRep")}</label>
          <Textarea value={form.authorizedRep} onChange={(e) => set("authorizedRep", e.target.value)} disabled={!canEdit} rows={2} />
        </div>

        {/* Notified Body — searchable picker + manual name/number */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("settings.notifiedBody")}</label>
          {canEdit && (
            <div className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={nbQuery}
                  placeholder={t("settings.nbSearch")}
                  onChange={(e) => { setNbQuery(e.target.value); setNbOpen(true); }}
                  onFocus={() => setNbOpen(true)}
                  onBlur={() => setTimeout(() => setNbOpen(false), 150)}
                />
              </div>
              {nbOpen && nbMatches.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
                  {nbMatches.map((nb) => (
                    <button
                      key={nb.number}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={(e) => { e.preventDefault(); pickNb(nb); }}
                    >
                      <Badge variant="outline">{nb.number}</Badge>
                      <span className="flex-1">{nb.name}</span>
                      <span className="flex shrink-0 gap-1">
                        {nb.regulations.map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                        ))}
                      </span>
                      <span className="w-7 shrink-0 text-right text-xs text-muted-foreground">{nb.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Input value={form.notifiedBody} onChange={(e) => set("notifiedBody", e.target.value)} disabled={!canEdit} placeholder={t("settings.nbNamePlaceholder")} />
            <Input value={form.notifiedBodyNumber} onChange={(e) => set("notifiedBodyNumber", e.target.value)} disabled={!canEdit} placeholder="0123" />
          </div>
          <p className="text-xs text-muted-foreground">{t("settings.nbHint")}</p>
        </div>

        {error && (
          <p className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}
        {saved && (
          <p className="flex items-center gap-1 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> {t("settings.companySaved")}
          </p>
        )}
        {canEdit ? (
          <Button className="gap-1.5" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("common.save")}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">{t("settings.logo.noPermission")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LogoCard({ hasLogo, canEdit }: { hasLogo: boolean; canEdit: boolean }) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [present, setPresent] = useState(hasLogo);
  const [version, setVersion] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(hasLogo);

  useEffect(() => {
    if (!present) {
      setLogoUrl(null);
      setLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    setError(null);

    fetch(`/api/company/logo?v=${version}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("logo missing");
        const blob = await res.blob();
        if (cancelled) return;
        setLogoUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!cancelled) {
          setLogoUrl(null);
          setPresent(false);
          setError(t("settings.logo.missingFile"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [present, version, t]);

  useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setError(t("settings.logo.invalidType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(t("settings.logo.tooLarge"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("settings.logo.uploadFailed"));
        return;
      }
      setPresent(true);
      setVersion(Date.now());
    } catch {
      setError(t("settings.logo.networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("settings.logo.removeFailed"));
        return;
      }
      setPresent(false);
    } catch {
      setError(t("settings.logo.networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t("settings.logo.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("settings.logo.desc")}</p>

        <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30">
          {loadingPreview ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={t("settings.logo.title")} className="max-h-24 max-w-[80%] object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImageIcon className="h-7 w-7" />
              <span className="text-xs">{t("settings.logo.empty")}</span>
            </div>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        {canEdit ? (
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPick} />
            <Button className="gap-1.5" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {present ? t("settings.logo.replace") : t("settings.logo.upload")}
            </Button>
            {present && (
              <Button variant="outline" className="gap-1.5 text-destructive" disabled={busy} onClick={remove}>
                <Trash2 className="h-4 w-4" /> {t("settings.logo.remove")}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("settings.logo.noPermission")}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("settings.logo.hint")}</p>
      </CardContent>
    </Card>
  );
}
