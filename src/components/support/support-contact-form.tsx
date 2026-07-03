"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip, X, ImageIcon } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SUPPORT_MAX_FILES, SUPPORT_MAX_FILE_MB } from "@/lib/support/constants";

const ACCEPT = "image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf,.docx";

export function SupportContactForm({ className }: { className?: string }) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setFiles((prev) => {
      const next = [...prev];
      for (const file of Array.from(list)) {
        if (next.length >= SUPPORT_MAX_FILES) break;
        if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
        next.push(file);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData();
    form.append("name", name.trim());
    form.append("email", email.trim());
    form.append("subject", subject);
    form.append("message", message);
    for (const file of files) form.append("files", file);

    const res = await fetch("/api/support", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t("help.form.error"));
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <p className={`rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-success ${className ?? ""}`}>
        {t("help.form.sent")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={`space-y-3 ${className ?? ""}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder={t("help.form.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="email"
          placeholder={t("help.form.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Input
        placeholder={t("help.form.subject")}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
      />
      <Textarea
        rows={5}
        placeholder={t("help.form.message")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
      />

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{t("help.form.attachments")}</p>
            <p className="text-xs text-muted-foreground">{t("help.form.attachmentsHint")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={files.length >= SUPPORT_MAX_FILES}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
            {t("help.form.attachmentsAdd")}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ACCEPT}
          multiple
          onChange={(e) => addFiles(e.target.files)}
        />
        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${file.size}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    ({Math.max(1, Math.round(file.size / 1024))} KB)
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => removeFile(i)}
                  aria-label={t("help.form.attachmentsRemove")}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {t("help.form.attachmentsLimit")
            .replace("{max}", String(SUPPORT_MAX_FILES))
            .replace("{mb}", String(SUPPORT_MAX_FILE_MB))}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full gap-1 sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("help.form.submit")}
      </Button>
    </form>
  );
}
