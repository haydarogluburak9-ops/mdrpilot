"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, UserPlus, Trash2 } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Member = { id: string; name: string | null; email: string; role: string; emailVerified: boolean };
type Invite = { id: string; email: string; role: string; expiresAt: string };
type Usage = {
  planName: string;
  maxProducts: number;
  maxSeats: number;
  productCount: number;
  seatCount: number;
  pendingInvites: number;
};

const INVITE_ROLES = ["QUALITY_MANAGER", "REGULATORY_AFFAIRS", "CONSULTANT", "VIEWER"] as const;

export function TeamPanel({ canManage }: { canManage: boolean }) {
  const { t } = useI18n();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof INVITE_ROLES)[number]>("VIEWER");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch("/api/team/invites");
    const data = await res.json();
    setMembers(data.members ?? []);
    setInvites(data.invites ?? []);
    setUsage(data.usage ?? null);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function sendInvite() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/team/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t("team.error"));
      setBusy(false);
      return;
    }
    setEmail("");
    await refresh();
    setBusy(false);
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/team/invites?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  async function removeMember(userId: string) {
    if (!confirm(t("team.removeConfirm"))) return;
    await fetch(`/api/team/members/${userId}`, { method: "DELETE" });
    await refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const seatsUsed = (usage?.seatCount ?? 0) + (usage?.pendingInvites ?? 0);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t("team.title")}</CardTitle>
        {usage && (
          <p className="text-sm text-muted-foreground">
            {seatsUsed}/{usage.maxSeats} {t("team.seats")} · {usage.productCount}/{usage.maxProducts}{" "}
            {t("team.products")} · {usage.planName}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{m.name ?? m.email}</p>
                <p className="text-xs text-muted-foreground">
                  {m.email} · {t(`role.${m.role}`)}
                  {m.emailVerified && (
                    <CheckCircle2 className="ml-1 inline h-3 w-3 text-success" />
                  )}
                </p>
              </div>
              {canManage && m.role !== "OWNER" && (
                <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {invites.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">{t("team.pending")}</p>
            <ul className="space-y-1">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                  <span>
                    {i.email} <Badge variant="secondary">{t(`role.${i.role}`)}</Badge>
                  </span>
                  {canManage && (
                    <Button variant="ghost" size="sm" onClick={() => revokeInvite(i.id)}>
                      {t("team.revoke")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canManage && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Input
              type="email"
              placeholder={t("team.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof INVITE_ROLES)[number])}
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`role.${r}`)}
                </option>
              ))}
            </select>
            <Button className="gap-1" onClick={sendInvite} disabled={busy || !email.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {t("team.inviteBtn")}
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
