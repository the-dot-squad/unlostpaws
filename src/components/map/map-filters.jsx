"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LISTING_TYPES, PET_TYPES } from "@/config/constants/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

/** Above Leaflet panes — keep dropdowns usable on the map page. */
const SELECT_CONTENT_CLASS = "z-[1100]";

const EMPTY_FILTERS = { type: "", petType: "" };

function filtersFromParams(params) {
  return {
    type: params.get("type") || "",
    petType: params.get("petType") || "",
  };
}

function filtersEqual(a, b) {
  return a.type === b.type && a.petType === b.petType;
}

function filtersToSearchParams(filters) {
  const next = new URLSearchParams();
  if (filters.type) next.set("type", filters.type);
  if (filters.petType) next.set("petType", filters.petType);
  return next;
}

function MapFiltersForm({ applied }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState(applied);

  const isDirty = !filtersEqual(draft, applied);

  function applyFilters() {
    const next = filtersToSearchParams(draft);
    const qs = next.toString();
    trackEvent(ANALYTICS_EVENTS.MAP_FILTER, {
      type: draft.type,
      pet_type: draft.petType,
    });
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearFilters() {
    setDraft(EMPTY_FILTERS);
    router.replace(pathname);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (isDirty) applyFilters();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[10rem] flex-1 space-y-1.5 sm:max-w-[14rem]">
        <label htmlFor="map-filter-type" className="text-xs text-muted-foreground">
          {t("map.alertType")}
        </label>
        <Select
          value={draft.type || "all"}
          onValueChange={(v) => setDraft((prev) => ({ ...prev, type: v === "all" ? "" : v }))}
        >
          <SelectTrigger id="map-filter-type" className="h-9 bg-background">
            <SelectValue placeholder={t("common.all")} />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT_CLASS}>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {LISTING_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`listingTypes.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[10rem] flex-1 space-y-1.5 sm:max-w-[14rem]">
        <label htmlFor="map-filter-pet-type" className="text-xs text-muted-foreground">
          {t("map.petType")}
        </label>
        <Select
          value={draft.petType || "all"}
          onValueChange={(v) => setDraft((prev) => ({ ...prev, petType: v === "all" ? "" : v }))}
        >
          <SelectTrigger id="map-filter-pet-type" className="h-9 bg-background">
            <SelectValue placeholder={t("common.all")} />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT_CLASS}>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {PET_TYPES.map((pt) => (
              <SelectItem key={pt} value={pt}>
                <span className="flex items-center gap-2">
                  <PetTypeIcon type={pt} />
                  {t(`petTypes.${pt}`)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 ms-auto">
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={clearFilters}>
          {t("listings.clearFilters")}
        </Button>
        <Button type="submit" size="sm" className="gap-2" disabled={!isDirty}>
          <Search className="size-4" />
          {t("map.applyFilters")}
        </Button>
      </div>
    </form>
  );
}

export function MapFilters() {
  const params = useSearchParams();
  const applied = useMemo(() => filtersFromParams(params), [params]);
  const formKey = params.toString();

  return <MapFiltersForm key={formKey} applied={applied} />;
}
