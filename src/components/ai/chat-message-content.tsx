import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { cn } from "@/lib/utils";

/** Prettify dense parenthetical example lists into markdown bullets. */
export function normalizeChatMarkdown(text: string): string {
  let out = text.replace(/\r\n/g, "\n").trim();

  // "(Örn. a, b, c vb.)" or "(e.g. a, b, c)" → bullet list
  out = out.replace(
    /[(\[]\s*(?:Örn\.|örn\.|e\.g\.|örneğin|for example)\s*[:.]?\s*([^)\]]+)[)\]]\s*$/im,
    (_, items: string) => {
      const parts = items
        .split(/[,;]/)
        .map((s) => s.replace(/\s+vb\.?\s*$/i, "").trim())
        .filter(Boolean);
      if (parts.length < 2) return `(${items})`;
      return `\n\n${parts.map((p) => `- ${p}`).join("\n")}`;
    },
  );

  // Ensure blank line before bullet blocks mid-message
  out = out.replace(/([^\n])\n(- )/g, "$1\n\n$2");

  return out;
}

export function ChatMessageContent({
  content,
  role,
  className,
}: {
  content: string;
  role: "user" | "assistant";
  className?: string;
}) {
  if (role === "user") {
    return (
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", className)}>{content}</p>
    );
  }

  return (
    <MarkdownPreview
      markdown={normalizeChatMarkdown(content)}
      className={cn(
        "[&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-2 [&_ol]:my-2",
        "[&_li]:leading-relaxed",
        className,
      )}
    />
  );
}
