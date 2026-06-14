import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function normalizeSearchParams(searchParams) {
  const params = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null || value === "") continue;
    params[key] = Array.isArray(value) ? value[0] : String(value);
  }
  return params;
}

function buildPageHref(pathname, params, page) {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * URL-based pagination — preserves active filter query params.
 */
export function ListingsPagination({ pathname, searchParams, page, totalPages }) {
  if (totalPages <= 1) return null;

  const params = normalizeSearchParams(searchParams);

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  // Window of page numbers around the current page.
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-4">
      <Button variant="outline" size="icon" className="size-9" disabled={page <= 1} asChild={page > 1}>
        {page > 1 ? (
          <Link href={buildPageHref(pathname, params, prevPage)} aria-label="Previous page">
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </Link>
        ) : (
          <span>
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </span>
        )}
      </Button>

      {start > 1 && (
        <>
          <PageLink pathname={pathname} params={params} page={1} active={page === 1}>
            1
          </PageLink>
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}

      {pages.map((p) => (
        <PageLink key={p} pathname={pathname} params={params} page={p} active={p === page}>
          {p}
        </PageLink>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <PageLink pathname={pathname} params={params} page={totalPages} active={page === totalPages}>
            {totalPages}
          </PageLink>
        </>
      )}

      <Button
        variant="outline"
        size="icon"
        className="size-9"
        disabled={page >= totalPages}
        asChild={page < totalPages}
      >
        {page < totalPages ? (
          <Link href={buildPageHref(pathname, params, nextPage)} aria-label="Next page">
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Link>
        ) : (
          <span>
            <ChevronRight className="size-4 rtl:rotate-180" />
          </span>
        )}
      </Button>
    </nav>
  );
}

function PageLink({ pathname, params, page, active, children }) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="icon"
      className={cn("size-9", active && "pointer-events-none")}
      asChild={!active}
    >
      {active ? (
        <span>{children}</span>
      ) : (
        <Link href={buildPageHref(pathname, params, page)}>{children}</Link>
      )}
    </Button>
  );
}
