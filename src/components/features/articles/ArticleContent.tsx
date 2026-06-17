import * as React from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

// Enable GFM line breaks: single \n → <br> so authors get
// visual line breaks without needing double-newlines.
marked.setOptions({ breaks: true, gfm: true });

export interface ArticleContentProps {
  content: string;
}

export function ArticleContent({ content }: ArticleContentProps) {
  const htmlContent = React.useMemo(() => {
    if (!content) return "";
    try {
      // Parse markdown to HTML synchronously (breaks: true converts single \n to <br>)
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
