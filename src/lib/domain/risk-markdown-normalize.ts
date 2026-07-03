/** Word export öncesi: tüm markdown başlıklarını ## yap, fazla hashtag'leri temizle. */
export function normalizeRiskDocMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .map((rawLine) => {
      const trimmed = rawLine.trim();
      const m = /^(#{1,6})\s+(.*)$/.exec(trimmed);
      if (!m) return rawLine;
      const text = m[2].replace(/^(?:#{1,6}\s+)+/, "").trim();
      if (!text) return rawLine;
      return `## ${text}`;
    })
    .join("\n");
}
