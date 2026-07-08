"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronsUpDown } from "lucide-react";
import { getCountryOptions } from "@/config/countries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Searchable country picker storing ISO 3166-1 alpha-2 codes.
 */
export function CountrySelect({ value, onChange, label, id = "country" }) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(() => getCountryOptions(locale), [locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
    );
  }, [options, query]);

  const selected = options.find((o) => o.code === value);

  return (
    <div className="space-y-1">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span>
                {selected.name}{" "}
                <span className="text-muted-foreground">({selected.code})</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{t("listings.selectCountry")}</span>
            )}
            <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="border-b p-2">
            <Input
              placeholder={t("listings.searchCountry")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t("listings.noCountryResults")}
              </li>
            ) : (
              filtered.map((option) => (
                <li key={option.code}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                      value === option.code && "bg-accent"
                    )}
                    onClick={() => {
                      onChange(option.code);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn("size-4", value === option.code ? "opacity-100" : "opacity-0")}
                    />
                    <span className="flex-1 text-start">{option.name}</span>
                    <span className="text-xs text-muted-foreground">{option.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
