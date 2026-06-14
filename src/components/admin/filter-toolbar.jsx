"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Reusable admin filter bar — syncs filters to URL search params.
 *
 * @param {object} props
 * @param {string} [props.searchPlaceholder]
 * @param {Array<{
 *   key: string,
 *   label: string,
 *   defaultValue?: string,
 *   clearOnAll?: boolean,
 *   includeAllOption?: boolean,
 *   options: Array<{ value: string, label: string }>,
 * }>} [props.filters]
 */
export function AdminFilterToolbar({ searchPlaceholder = "Search…", filters = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function pushParams(next) {
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function updateParam(key, value, clearOnAll = true) {
    const next = new URLSearchParams(params.toString());
    if (!value || (value === "all" && clearOnAll)) next.delete(key);
    else next.set(key, value);
    pushParams(next);
  }

  function clearAll() {
    startTransition(() => router.push(pathname));
  }

  const hasFilters = params.toString().length > 0;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="min-w-[200px] flex-1 space-y-1.5">
        <Label htmlFor="admin-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="admin-search"
            placeholder={searchPlaceholder}
            defaultValue={params.get("q") || ""}
            className="ps-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("q", e.currentTarget.value);
            }}
            onBlur={(e) => updateParam("q", e.target.value)}
          />
        </div>
      </div>

      {filters.map((filter) => {
        const defaultValue = filter.defaultValue ?? "all";
        const showAllOption = filter.includeAllOption !== false;

        return (
          <div key={filter.key} className="space-y-1.5">
            <Label>{filter.label}</Label>
            <Select
              value={params.get(filter.key) || defaultValue}
              onValueChange={(v) => updateParam(filter.key, v, filter.clearOnAll !== false)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {showAllOption ? <SelectItem value="all">All</SelectItem> : null}
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={clearAll} disabled={pending} className="mb-0.5">
          <X className="size-4" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
