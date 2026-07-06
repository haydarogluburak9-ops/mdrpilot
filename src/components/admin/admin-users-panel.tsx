"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminUsersData } from "@/lib/admin/users-types";

const PLAN_OPTIONS = [
  { key: "starter", label: "Starter" },
  { key: "basic", label: "Basic" },
  { key: "plus", label: "Plus" },
  { key: "pro", label: "Pro" },
] as const;

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

function roleLabel(role: string | null) {
  if (!role) return "—";
  const map: Record<string, string> = {
    OWNER: "Sahip",
    QUALITY_MANAGER: "Kalite müdürü",
    REGULATORY_AFFAIRS: "Regülasyon",
    CONSULTANT: "Danışman",
    VIEWER: "İzleyici",
  };
  return map[role] ?? role;
}

export function AdminUsersPanel({ initialData }: { initialData: AdminUsersData }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [planKey, setPlanKey] = useState<(typeof PLAN_OPTIONS)[number]["key"]>("plus");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [planDraft, setPlanDraft] = useState<Record<string, string>>({});

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          password,
          planKey: planKey === "starter" ? undefined : planKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kullanıcı eklenemedi");
      setMessage(`${data.email} hesabı oluşturuldu. Kullanıcı bu parola ile giriş yapabilir.`);
      setEmail("");
      setName("");
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function patchUser(
    userId: string,
    body: { action: "assign_plan"; planKey: string } | { action: "remove" },
  ) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "İşlem başarısız");
    return data;
  }

  async function onAssignPlan(userId: string) {
    const plan = planDraft[userId] ?? "plus";
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await patchUser(userId, { action: "assign_plan", planKey: plan });
      setMessage("Plan güncellendi.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function onRemove(userId: string, userEmail: string) {
    if (!confirm(`${userEmail} kullanıcısını platformdan kaldırmak istediğinize emin misiniz?`)) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await patchUser(userId, { action: "remove" });
      setMessage("Kullanıcı kaldırıldı.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-12">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Kullanıcı yönetimi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kart ödeme altyapısı olmadan kullanıcı ekleyin, plan atayın veya hesabı kaldırın. Yeni kullanıcılar
          e-posta doğrulaması olmadan giriş yapabilir.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Toplam kullanıcı" value={initialData.summary.total} />
        <Stat label="Firması olan" value={initialData.summary.withCompany} />
        <Stat label="Onboarding bekleyen" value={initialData.summary.withoutCompany} />
      </div>

      <form onSubmit={createUser} className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">Yeni kullanıcı ekle</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium">E-posta</label>
            <Input
              type="email"
              placeholder="kullanici@firma.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Ad soyad</label>
            <Input
              placeholder="Ad Soyad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Geçici parola</label>
            <Input
              type="password"
              minLength={8}
              placeholder="En az 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Firma planı (varsa)</label>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={planKey}
              onChange={(e) => setPlanKey(e.target.value as (typeof PLAN_OPTIONS)[number]["key"])}
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Yalnızca mevcut firmaya uygulanır. Yeni kullanıcı için onboarding sonrası tablodan plan atayın.
            </p>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
        <Button type="submit" className="mt-4" disabled={loading}>
          {loading ? "Kaydediliyor…" : "Kullanıcı ekle"}
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Kullanıcı</th>
              <th className="px-5 py-3 font-medium">Firma</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Kayıt</th>
              <th className="px-5 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {initialData.users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                  Henüz kullanıcı yok.
                </td>
              </tr>
            ) : (
              initialData.users.map((u) => (
                <tr key={u.userId} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium">{u.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant={u.emailVerified ? "secondary" : "outline"}>
                        {u.emailVerified ? "Doğrulandı" : "Bekliyor"}
                      </Badge>
                      {u.role ? <Badge variant="outline">{roleLabel(u.role)}</Badge> : null}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {u.companyName ?? (
                      <span className="text-muted-foreground">Onboarding bekliyor</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary">{u.planName}</Badge>
                    {u.activeDemo ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Aktif demo</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {u.companyId ? (
                        <>
                          <select
                            className="h-9 rounded-lg border border-input bg-card px-2 text-xs"
                            value={planDraft[u.userId] ?? u.planKey}
                            onChange={(e) =>
                              setPlanDraft((prev) => ({ ...prev, [u.userId]: e.target.value }))
                            }
                            disabled={loading}
                          >
                            {PLAN_OPTIONS.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => onAssignPlan(u.userId)}
                          >
                            Plan ata
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Firma yok</span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={loading}
                        onClick={() => onRemove(u.userId, u.email)}
                      >
                        Kaldır
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
