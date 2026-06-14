import * as React from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

export interface ArticleContentProps {
  content: string;
}

export function ArticleContent({ content }: ArticleContentProps) {
  const htmlContent = React.useMemo(() => {
    if (!content) return "";
    try {
      // Parse markdown to HTML synchronously
      const rawHtml = marked.parse(content) as string;
      // Sanitize the parsed HTML to prevent XSS vulnerabilities
      return DOMPurify.sanitize(rawHtml);
    } catch (error) {
      console.error("Failed to parse markdown content:", error);
      return "";
    }
  }, [content]);

  return (
    <article
      data-testid="article-content"
      className="prose prose-stone dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
