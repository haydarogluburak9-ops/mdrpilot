"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type LogRow = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  userName: string | null;
  ip: string | null;
  createdAt: string;
};

export function ActivityLogView() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(next?: string | null) {
    const params = new URLSearchParams({ limit: "40" });
    if (filter.trim()) params.set("action", filter.trim());
    if (next) params.set("cursor", next);
    const res = await fetch(`/api/audit-logs?${params}`);
    const data = await res.json();
    const rows = (data.logs ?? []) as LogRow[];
    setLogs((prev) => (next ? [...prev, ...rows] : rows));
    setCursor(data.nextCursor ?? null);
  }

  useEffect(() => {
    setLoading(true);
    load()
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <PageHeader title={t("activity.title")} description={t("activity.desc")} />
      <div className="mb-4 flex gap-2">
        <Input
          placeholder={t("activity.filter")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {logs.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">{t("activity.empty")}</p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium font-mono text-xs">{l.action}</p>
                    <p className="text-muted-foreground">
                      {l.userName ?? "—"}
                      {l.entity ? ` · ${l.entity}` : ""}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleString()}
                  </time>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
      {cursor && !loading && (
        <Button
          variant="outline"
          className="mt-4"
          disabled={loadingMore}
          onClick={async () => {
            setLoadingMore(true);
            await load(cursor);
            setLoadingMore(false);
          }}
        >
          {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : t("activity.loadMore")}
        </Button>
      )}
    </div>
  );
}
