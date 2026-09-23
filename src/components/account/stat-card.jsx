import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Dashboard metric tile with optional link.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string | number} props.value
 * @param {string} [props.suffix] — small unit after the value (e.g. "days")
 * @param {import("lucide-react").LucideIcon} [props.icon]
 * @param {string} [props.href]
 * @param {string} [props.className]
 * @param {string} [props.iconClassName]
 * @param {string} [props.valueClassName]
 */
export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  href,
  className,
  iconClassName,
  valueClassName,
}) {
  const content = (
    <Card
      className={cn(
        "h-full transition-colors",
        href && "hover:border-primary/30",
        className
      )}
    >
      <CardContent className="flex h-full items-center gap-3 p-4">
        {Icon ? (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10",
              iconClassName
            )}
          >
            <Icon className="size-4 text-primary" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "flex items-baseline gap-1 text-2xl font-bold tabular-nums leading-none",
              valueClassName
            )}
          >
            <span className="truncate">{value}</span>
            {suffix ? (
              <span className="text-xs font-medium text-muted-foreground">{suffix}</span>
            ) : null}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground" title={label}>
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full min-w-0">
        {content}
      </Link>
    );
  }

  return content;
}
