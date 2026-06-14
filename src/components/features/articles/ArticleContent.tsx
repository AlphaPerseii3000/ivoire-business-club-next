import * as React from "react";

export interface ArticleContentProps {
  content: string;
}

function parseInline(text: string): string {
  // First escape HTML to prevent XSS
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Bold **text**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

  // Italic *text*
  escaped = escaped.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Code `text`
  escaped = escaped.replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded font-mono text-sm">$1</code>');

  return escaped;
}

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  // Normalize newlines
  const normalized = markdown.replace(/\r\n/g, "\n");

  // Split into paragraphs/blocks by double newlines
  const blocks = normalized.split(/\n\s*\n/);

  const htmlBlocks = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";

    // Check for Headings
    if (trimmed.startsWith("# ")) {
      const text = trimmed.substring(2);
      return `<h1 class="text-3xl font-bold tracking-tight text-foreground mt-8 mb-4">${parseInline(text)}</h1>`;
    }
    if (trimmed.startsWith("## ")) {
      const text = trimmed.substring(3);
      return `<h2 class="text-2xl font-bold tracking-tight text-foreground mt-6 mb-3">${parseInline(text)}</h2>`;
    }
    if (trimmed.startsWith("### ")) {
      const text = trimmed.substring(4);
      return `<h3 class="text-xl font-semibold tracking-tight text-foreground mt-4 mb-2">${parseInline(text)}</h3>`;
    }

    // Check for Lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const lines = trimmed.split("\n");
      const listItems = lines
        .map((line) => {
          const itemText = line.replace(/^[-*]\s+/, "");
          return `<li class="my-1.5">${parseInline(itemText)}</li>`;
        })
        .join("");
      return `<ul class="list-disc pl-6 my-4 space-y-1 text-muted-foreground">${listItems}</ul>`;
    }

    // Default Paragraph
    return `<p class="leading-relaxed text-muted-foreground my-4">${parseInline(trimmed)}</p>`;
  });

  return htmlBlocks.filter(Boolean).join("\n");
}

export function ArticleContent({ content }: ArticleContentProps) {
  const htmlContent = React.useMemo(() => parseMarkdownToHtml(content), [content]);

  return (
    <article
      data-testid="article-content"
      className="prose prose-stone dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
