"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Hybrid combobox: pick a suggestion or commit custom free-text.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {Array<{ value: string, label: string }>} props.options
 * @param {string} [props.placeholder]
 * @param {string} [props.id]
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 * @param {boolean} [props.allowCustom=true]
 */
export function SuggestCombobox({
  value,
  onChange,
  options,
  placeholder,
  id,
  required = false,
  disabled = false,
  className,
  allowCustom = true,
}) {
  const t = useTranslations("suggest");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  const trimmedQuery = query.trim();
  const exactLabelMatch = options.some(
    (o) => o.label.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showCustom =
    allowCustom && trimmedQuery.length > 0 && !exactLabelMatch;

  function commit(next) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  function handleOpenChange(nextOpen) {
    if (!nextOpen && allowCustom && trimmedQuery && trimmedQuery !== value) {
      onChange(trimmedQuery);
    }
    if (!nextOpen) setQuery("");
    setOpen(nextOpen);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-required={required || undefined}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder || t("search")}</span>
          )}
          <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <Input
            placeholder={t("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (showCustom) {
                  commit(trimmedQuery);
                } else if (filtered[0]) {
                  commit(filtered[0].label);
                }
              }
            }}
            className="h-8"
            autoFocus
          />
        </div>
        <ul className="max-h-60 overflow-y-auto p-1">
          {showCustom ? (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => commit(trimmedQuery)}
              >
                <Check className="size-4 opacity-0" />
                <span className="flex-1 text-start">{t("useCustom", { query: trimmedQuery })}</span>
              </button>
            </li>
          ) : null}
          {filtered.length === 0 && !showCustom ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">
              {t("noResults")}
            </li>
          ) : (
            filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                    value === option.label && "bg-accent"
                  )}
                  onClick={() => commit(option.label)}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === option.label ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 text-start">{option.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
