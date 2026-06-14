"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const FILTERS = ["active", "all", "confirmed", "dismissed"];

/**
 * Tab-style filter bar that updates the `filter` search param.
 */
export function MatchFilterBar({ counts }) {
  const t = useTranslations("matches");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("filter") || "active";

  function setFilter(filter) {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "active") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const labels = {
    active: t("filterActive"),
    all: t("filterAll"),
    confirmed: t("filterConfirmed"),
    dismissed: t("filterDismissed"),
  };

  return (
    <div className="inline-flex h-9 w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => setFilter(filter)}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
            current === filter && "bg-background text-foreground shadow-sm"
          )}
        >
          {labels[filter]} ({counts[filter]})
        </button>
      ))}
    </div>
  );
}
