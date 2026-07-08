import { cn } from "@/lib/utils";
import { SafeHtml } from "@/components/marketing/safe-html";

const PROSE =
  "cms-html space-y-4 text-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-medium [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:ps-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:ps-6 [&_li]:leading-relaxed [&_li]:text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_blockquote]:border-s-4 [&_blockquote]:border-primary/30 [&_blockquote]:ps-4 [&_blockquote]:italic";

/** Renders sanitized CMS HTML on public pages. */
export function HtmlContent({ html, className }) {
  return <SafeHtml html={html} className={cn(PROSE, className)} />;
}
