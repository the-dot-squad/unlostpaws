import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANTS = {
  active: "default",
  resolved: "secondary",
  expired: "outline",
  removed: "destructive",
  under_review: "destructive",
  open: "destructive",
  reviewing: "secondary",
  dismissed: "outline",
  pending: "outline",
  notified: "default",
  archived: "secondary",
  admin: "default",
  moderator: "secondary",
  user: "outline",
};

const ML_VARIANTS = {
  pending: "outline",
  processing: "secondary",
  ready: "default",
  failed: "destructive",
};

/**
 * Colored badge for entity statuses and roles.
 */
export function AdminStatusBadge({ value, className }) {
  if (!value) return null;
  if (value === "verified") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize font-medium",
          className
        )}
      >
        Verified
      </Badge>
    );
  }
  const variant = VARIANTS[value] || "outline";

  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

/** ML pipeline status for listings and owned pets in admin tables. */
export function AdminMlStatusBadge({ value, className }) {
  if (!value) return null;
  const variant = ML_VARIANTS[value] || "outline";

  return (
    <Badge variant={variant} className={cn("text-xs capitalize", className)}>
      ML: {value.replace(/_/g, " ")}
    </Badge>
  );
}
