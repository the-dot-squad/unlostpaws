import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Highlights items that need moderator attention on the dashboard home.
 */
export function DashboardAttentionBanner({ items }) {
  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
        <AlertTriangle className="size-4 shrink-0" />
        Needs attention
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted/50 dark:border-amber-900/50"
          >
            <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
              {item.count}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
