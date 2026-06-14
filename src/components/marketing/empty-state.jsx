import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Reusable empty state for listings, map, and home sections.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        {Icon && (
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Icon className="size-7 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
        </div>
        {actionLabel && actionHref && (
          <Button asChild variant="outline">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
