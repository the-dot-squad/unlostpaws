import { createSanitizedHtmlProps } from "@/lib/content/sanitize-html";
import { cn } from "@/lib/utils";

/**
 * Renders HTML after DOMPurify sanitization (client-safe).
 * @param {{ html: string, className?: string, tag?: keyof JSX.IntrinsicElements }} props
 */
export function SafeHtml({ html, className, tag: Tag = "div" }) {
  const sanitizedProps = createSanitizedHtmlProps(html);
  if (!sanitizedProps) return null;

  return <Tag className={cn(className)} {...sanitizedProps} />;
}
