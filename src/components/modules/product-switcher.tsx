"use client";

import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import type { Product } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function ProductSwitcher({
  products,
  value,
  onChange,
}: {
  products: Pick<Product, "id" | "name" | "deviceClass">[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
            value === p.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card hover:bg-muted",
          )}
        >
          <span className="block font-medium">{p.name}</span>
          <span className="block text-xs text-muted-foreground">
            {DEVICE_CLASS_LABEL[p.deviceClass]}
          </span>
        </button>
      ))}
    </div>
  );
}
