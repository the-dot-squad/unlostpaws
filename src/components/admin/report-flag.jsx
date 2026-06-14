import Link from "next/link";
import { Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Open-report flag — count comes from live moderation data, not listing.reportCount.
 */
export function ReportFlag({
  listingId,
  openReportCount = 0,
  openCaseCount = 0,
  className,
}) {
  if (!openReportCount || openReportCount < 1) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const caseLabel =
    openCaseCount > 1
      ? `${openCaseCount} open cases`
      : `${openReportCount} open report${openReportCount === 1 ? "" : "s"}`;

  return (
    <Link
      href={`/admin/reports?listingId=${listingId}&status=open`}
      className={cn("inline-flex items-center gap-1.5 hover:opacity-80", className)}
      title={`${caseLabel} — review in moderation queue`}
    >
      <Flag className="size-3.5 text-destructive" />
      <Badge variant="destructive" className="h-5 px-1.5 text-xs tabular-nums">
        {openReportCount}
      </Badge>
    </Link>
  );
}
