"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminCustomersData } from "@/lib/admin/customers-types";

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

function planBadgeVariant(key: string): "default" | "secondary" | "outline" {
  if (key === "pro" || key === "enterprise") return "default";
  if (key === "plus" || key === "basic") return "secondary";
  return "outline";
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    OWNER: "Sahip",
    QUALITY_MANAGER: "Kalite müdürü",
    REGULATORY_AFFAIRS: "Regülasyon",
    CONSULTANT: "Danışman",
    VIEWER: "İzleyici",
  };
  return map[role] ?? role;
}

export function AdminCustomersPanel({ companies, pendingUsers, summary }: AdminCustomersData) {
  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform yönetimi</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Firmalar ve planlar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI tokenları <strong>firma bazında ortaktır</strong> — aynı şirketteki tüm kullanıcılar aynı kota havuzunu paylaşır.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Uygulamaya dön</Button>
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam firma" value={summary.totalCompanies} />
        <StatCard label="Toplam kullanıcı" value={summary.totalUsers} />
        <StatCard label="Onboarding bekleyen" value={summary.usersPendingOnboarding} />
        <StatCard
          label="Plan dağılımı (firma)"
          value={Object.keys(summary.planCounts).length}
          hint={Object.entries(summary.planCounts)
            .map(([k, n]) => `${k}: ${n}`)
            .join(" · ")}
        />
      </div>

      <div className="space-y-4">
        {companies.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            Henüz kayıtlı firma yok.
          </div>
        ) : (
          companies.map((company) => (
            <div key={company.companyId} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-muted/30 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold">{company.companyName}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {company.country ? `${company.country} · ` : ""}
                    Kuruluş: {formatDate(company.createdAt)} · {company.productCount} ürün · {company.memberCount} kullanıcı
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={planBadgeVariant(company.planKey)}>{company.planName}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {company.priceMonthly === 0 ? "Ücretsiz" : `€${company.priceMonthly}/ay`}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 border-b border-border px-5 py-4 sm:grid-cols-3">
                <TokenStat
                  label="Aylık kota"
                  value={company.monthlyAiTokens}
                  hint="Plana dahil token"
                />
                <TokenStat
                  label="Ek satın alınan"
                  value={company.extraAiTokens}
                  hint="Firma havuzuna eklenen"
                />
                <TokenStat
                  label="Kalan / kullanılan"
                  value={`${company.aiTokensRemaining} / ${company.aiTokensUsed}`}
                  hint="Tüm kullanıcılar ortak paylaşır"
                  highlight
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Kullanıcı</th>
                      <th className="px-5 py-2.5 font-medium">E-posta</th>
                      <th className="px-5 py-2.5 font-medium">Rol</th>
                      <th className="px-5 py-2.5 font-medium">Doğrulama</th>
                      <th className="px-5 py-2.5 font-medium">Katılım</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.members.map((m) => (
                      <tr key={m.userId} className="border-b border-border/50 last:border-0">
                        <td className="px-5 py-3 font-medium">{m.name ?? "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                        <td className="px-5 py-3">
                          <Badge variant="outline">{roleLabel(m.role)}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={m.emailVerified ? "secondary" : "outline"}>
                            {m.emailVerified ? "Doğrulandı" : "Bekliyor"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{formatDate(m.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {pendingUsers.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Henüz firması olmayan kullanıcılar</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Kullanıcı</th>
                  <th className="px-5 py-3 font-medium">Kayıt</th>
                  <th className="px-5 py-3 font-medium">E-posta durumu</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.userId} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium">{u.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={u.emailVerified ? "secondary" : "outline"}>
                        {u.emailVerified ? "Doğrulandı" : "Bekliyor"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function TokenStat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: number | string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
