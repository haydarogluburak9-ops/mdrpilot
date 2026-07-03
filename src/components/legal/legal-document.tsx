"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { BrandWordmark } from "@/components/brand/brand-lockup";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`ul-${listKey++}`} className="mb-4 ml-4 list-disc space-y-1 text-sm leading-relaxed text-foreground/90">
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      continue;
    }
    flushList();

    if (line.startsWith("## ")) {
      nodes.push(
        <h1 key={i} className="mb-2 mt-0 text-3xl font-bold tracking-tight">
          {line.slice(3)}
        </h1>,
      );
      continue;
    }
    if (line.startsWith("### ")) {
      nodes.push(
        <h2 key={i} className="mb-2 mt-8 text-lg font-semibold text-foreground">
          {line.slice(4)}
        </h2>,
      );
      continue;
    }
    if (line.startsWith("#### ")) {
      nodes.push(
        <h3 key={i} className="mb-2 mt-5 text-base font-semibold text-foreground">
          {line.slice(5)}
        </h3>,
      );
      continue;
    }
    if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      nodes.push(
        <p key={i} className="mb-4 text-sm text-muted-foreground">
          {line.replace(/\*\*/g, "")}
        </p>,
      );
      continue;
    }
    if (!line.trim()) {
      nodes.push(<div key={i} className="h-2" />);
      continue;
    }
    nodes.push(
      <p key={i} className="mb-2 text-sm leading-relaxed text-foreground/90">
        {renderInline(line)}
      </p>,
    );
  }
  flushList();
  return nodes;
}

export function LegalDocument({ content }: { content: string }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="text-sm font-semibold">
            <BrandWordmark className="text-sm" />
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">
              {t("legal.terms")}
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
              {t("legal.privacy")}
            </Link>
            <Link href="/login" className="text-primary hover:underline">
              {t("landing.nav.signin")}
            </Link>
          </div>
        </div>
      </header>
      <main className="container max-w-3xl py-10 pb-16">{renderMarkdown(content)}</main>
    </div>
  );
}
