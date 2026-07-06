"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminDemoData } from "@/lib/admin/demo-types";

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

function statusBadge(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active") return "default";
  if (status === "expired") return "destructive";
  return "outline";
}

function statusLabel(status: string) {
  if (status === "active") return "Aktif";
  if (status === "expired") return "Süresi doldu";
  return "İptal";
}

export function AdminDemoPanel({ initialData }: { initialData: AdminDemoData }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("14");
  const [planKey, setPlanKey] = useState<"plus" | "pro">("plus");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function grantDemo(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          days: Number(days),
          planKey,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo verilemedi");
      setMessage(`${data.userEmail} için demo aktif — bitiş: ${formatDate(data.expiresAt)}`);
      setEmail("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function patchGrant(id: string, body: { action: "extend"; days: number } | { action: "revoke" }) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/demo/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "İşlem başarısız");
    if (body.action === "extend") {
      setMessage(`Demo süresi uzatıldı — yeni bitiş: ${formatDate(data.expiresAt)}`);
    } else {
      setMessage("Demo erişimi kaldırıldı.");
    }
    router.refresh();
  }

  async function onExtend(id: string, extendDays: number) {
    setLoading(true);
    try {
      await patchGrant(id, { action: "extend", days: extendDays });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Bu kullanıcının demo erişimini kaldırmak istediğinize emin misiniz?")) return;
    setLoading(true);
    try {
      await patchGrant(id, { action: "revoke" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-12">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Demo erişimi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kullanıcılara süreli demo verin, uzatın veya kaldırın. Demo süresi dolunca firma erişimi kapanır; plan Starter&apos;a döner.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Aktif demo" value={initialData.summary.active} />
        <Stat label="Süresi dolmuş" value={initialData.summary.expired} />
        <Stat label="İptal edilmiş" value={initialData.summary.revoked} />
      </div>

      <form onSubmit={grantDemo} className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">Yeni demo ver</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Kullanıcı e-postası</label>
            <Input
              type="email"
              placeholder="kullanici@firma.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Süre (gün)</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Demo planı</label>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={planKey}
              onChange={(e) => setPlanKey(e.target.value as "plus" | "pro")}
            >
              <option value="plus">Plus</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <label className="text-sm font-medium">Not (isteğe bağlı)</label>
            <Input
              placeholder="Örn. fuar demosu, 30 gün pilot"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
        <Button type="submit" className="mt-4" disabled={loading}>
          {loading ? "Kaydediliyor…" : "Demo ver"}
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Kullanıcı</th>
              <th className="px-5 py-3 font-medium">Firma</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Durum</th>
              <th className="px-5 py-3 font-medium">Bitiş</th>
              <th className="px-5 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {initialData.grants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                  Henüz demo kaydı yok.
                </td>
              </tr>
            ) : (
              initialData.grants.map((g) => (
                <tr key={g.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium">{g.userName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{g.userEmail}</div>
                  </td>
                  <td className="px-5 py-3">{g.companyName}</td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary">{g.trialPlanKey}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={statusBadge(g.status)}>{statusLabel(g.status)}</Badge>
                    {g.status === "active" ? (
                      <p className="mt-1 text-xs text-muted-foreground">{g.daysRemaining} gün kaldı</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(g.expiresAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {g.status !== "revoked" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => onExtend(g.id, 7)}
                          >
                            +7 gün
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => onExtend(g.id, 30)}
                          >
                            +30 gün
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={loading}
                            onClick={() => onRevoke(g.id)}
                          >
                            Kaldır
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    {g.notes ? <p className="mt-2 text-xs text-muted-foreground">{g.notes}</p> : null}
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
