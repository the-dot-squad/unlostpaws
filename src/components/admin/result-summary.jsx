import { ADMIN_PAGE_SIZE } from "@/config/constants/platform";

/**
 * Shows how many records match the current filters.
 */
export function AdminResultSummary({ total, showing = total }) {
  const capped = showing >= ADMIN_PAGE_SIZE && total > ADMIN_PAGE_SIZE;

  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{total.toLocaleString()}</span>
      {total === 1 ? " result" : " results"}
      {capped ? (
        <span> — showing first {showing.toLocaleString()} (increase limit in constants to see more)</span>
      ) : null}
    </p>
  );
}
