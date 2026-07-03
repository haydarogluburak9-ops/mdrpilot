"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import { ChatMessageContent } from "@/components/ai/chat-message-content";

import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTION_KEYS = ["assistant.sg1", "assistant.sg2", "assistant.sg3", "assistant.sg4"];

export function AiAssistantDrawer({
  open,
  onClose,
  productId,
}: {
  open: boolean;
  onClose: () => void;
  productId?: string;
}) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t("assistant.greeting") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, productId, _locale: lang }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? "—" }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: t("assistant.error") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">{t("assistant.title")}</p>
                  <p className="text-[11px] text-muted-foreground">MDR 2017/745 · ISO 13485:2016 · ISO 14971:2019</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl text-sm leading-relaxed",
                      m.role === "user"
                        ? "rounded-br-sm bg-primary px-4 py-3 text-primary-foreground"
                        : "rounded-bl-sm bg-muted px-4 py-3.5 text-foreground",
                    )}
                  >
                    <ChatMessageContent content={m.content} role={m.role} />
                  </div>
                </div>
              ))}
              {loading && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 animate-pulse" /> {t("ai.analyzing")}
                  </div>
                  <AiAnalyzingHint />
                </div>
              )}

              {messages.length <= 1 && (
                <div className="space-y-2 pt-2">
                  {SUGGESTION_KEYS.map((k) => (
                    <button
                      key={k}
                      onClick={() => send(t(k))}
                      className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {t(k)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <Disclaimer className="mb-3" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("assistant.placeholder")}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" size="icon" disabled={loading}>
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
