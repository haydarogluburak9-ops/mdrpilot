import React from "react";

/** Renders inline markdown (bold, italic, code) to React nodes. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={`${keyPrefix}-b${i}`}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<em key={`${keyPrefix}-i${i}`}>{m[3]}</em>);
    else if (m[4] !== undefined) nodes.push(<code key={`${keyPrefix}-c${i}`} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{m[4]}</code>);
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function isTableSep(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-");
}
function splitRow(line: string): string[] {
  return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
}

/** Lightweight markdown renderer (headings, lists, tables, blockquotes, hr). */
export function MarkdownPreview({ markdown, className }: { markdown: string; className?: string }) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // Table
    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) { rows.push(splitRow(lines[i])); i++; }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>{header.map((h, hi) => <th key={hi} className="border border-border bg-muted px-2 py-1 text-left font-semibold">{inline(h, `th${key}-${hi}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-border px-2 py-1 align-top">{inline(c, `td${key}-${ri}-${ci}`)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Headings
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? "mt-2 text-2xl font-bold" : level === 2 ? "mt-4 text-lg font-bold" : level === 3 ? "mt-3 text-base font-semibold" : "mt-2 text-sm font-semibold";
      blocks.push(React.createElement(`h${level}`, { key: key++, className: cls }, inline(h[2], `h${key}`)));
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { blocks.push(<hr key={key++} className="my-4 border-border" />); i++; continue; }

    // Blockquote
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) { quote.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push(<blockquote key={key++} className="my-2 border-l-4 border-warning/60 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">{quote.map((q, qi) => <p key={qi}>{inline(q, `bq${key}-${qi}`)}</p>)}</blockquote>);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++; }
      blocks.push(<ul key={key++} className="my-2 list-disc space-y-1 pl-6 text-sm">{items.map((it, ii) => <li key={ii}>{inline(it, `ul${key}-${ii}`)}</li>)}</ul>);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++; }
      blocks.push(<ol key={key++} className="my-2 list-decimal space-y-1 pl-6 text-sm">{items.map((it, ii) => <li key={ii}>{inline(it, `ol${key}-${ii}`)}</li>)}</ol>);
      continue;
    }

    // Paragraph (merge consecutive non-empty, non-special lines)
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|\s*[-*]\s|\s*\d+\.\s|---+$)/.test(lines[i]) && !(lines[i].includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
      para.push(lines[i]); i++;
    }
    if (para.length) blocks.push(<p key={key++} className="my-2 text-sm leading-relaxed">{inline(para.join(" "), `p${key}`)}</p>);
    else i++;
  }

  return <div className={className}>{blocks}</div>;
}
