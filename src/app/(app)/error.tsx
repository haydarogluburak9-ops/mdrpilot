"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Page could not be loaded</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred. If this persists, restart the dev server."}
      </p>
      <Button type="button" size="sm" onClick={reset}>Try again</Button>
    </div>
  );
}
