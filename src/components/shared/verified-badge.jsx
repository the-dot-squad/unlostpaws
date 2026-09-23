import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

/**
 * Reusable blue verified badge for verified users.
 *
 * @param {object} props
 * @param {"sm" | "md" | "lg"} [props.size="md"]
 * @param {string} [props.label="Verified"] Accessible title and optional label text.
 * @param {boolean} [props.showLabel=false] Whether to render label text next to the icon.
 * @param {string} [props.className]
 */
export function VerifiedBadge({
  size = "md",
  label = "Verified",
  showLabel = false,
  className,
}) {
  const iconSizeClass = SIZES[size] || SIZES.md;

  if (showLabel) {
    return (
      <span
        title={label}
        aria-label={label}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20 text-xs",
          className
        )}
      >
        <BadgeCheck className={cn(iconSizeClass, "shrink-0 fill-blue-500/20 dark:fill-blue-400/20 text-blue-600 dark:text-blue-400")} aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      className={cn("inline-flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0", className)}
    >
      <BadgeCheck
        className={cn(iconSizeClass, "fill-blue-500/20 dark:fill-blue-400/20 text-blue-600 dark:text-blue-400")}
        aria-hidden="true"
      />
    </span>
  );
}
