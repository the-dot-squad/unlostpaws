"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LISTING_TYPES, PET_TYPES } from "@/config/constants/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";
import { CountrySelect } from "@/components/form/country-select";
import { ColorSuggest } from "@/components/form/breed-color-suggest";
import { cn } from "@/lib/utils";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

const EMPTY_FILTERS = {
  type: "",
  petType: "",
  color: "",
  country: "",
  lat: "",
  lng: "",
  radiusKm: "25",
};

function filtersFromParams(params) {
  return {
    type: params.get("type") || "",
    petType: params.get("petType") || "",
    color: params.get("color") || "",
    country: params.get("country") || "",
    lat: params.get("lat") || "",
    lng: params.get("lng") || "",
    radiusKm: params.get("radiusKm") || "25",
  };
}

function filtersEqual(a, b) {
  return (
    a.type === b.type &&
    a.petType === b.petType &&
    a.color === b.color &&
    a.country === b.country &&
    a.lat === b.lat &&
    a.lng === b.lng &&
    a.radiusKm === b.radiusKm
  );
}

function filtersToSearchParams(filters) {
  const next = new URLSearchParams();
  if (filters.type) next.set("type", filters.type);
  if (filters.petType) next.set("petType", filters.petType);
  if (filters.color.trim()) next.set("color", filters.color.trim());
  if (filters.country) next.set("country", filters.country);
  if (filters.lat && filters.lng) {
    next.set("lat", filters.lat);
    next.set("lng", filters.lng);
    next.set("radiusKm", filters.radiusKm || "25");
  }
  return next;
}

/** Renders standard search selectors: type, petType, color, country. */
function SearchFields({ draft, updateDraft, t }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label className="text-xs">{t("listings.type")}</Label>
        <Select
          value={draft.type || "all"}
          onValueChange={(v) => updateDraft("type", v === "all" ? "" : v)}
        >
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder={t("common.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {LISTING_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`listingTypes.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t("listings.petType")}</Label>
        <Select
          value={draft.petType || "all"}
          onValueChange={(v) => updateDraft("petType", v === "all" ? "" : v)}
        >
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder={t("common.all")} />
          </SelectTrigger>
          <SelectContent>
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

      <div className="space-y-1.5">
        <Label className="text-xs">{t("listings.color")}</Label>
        <ColorSuggest
          className="h-9 bg-background"
          value={draft.color}
          onChange={(v) => updateDraft("color", v)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-end gap-1">
          <div className="min-w-0 flex-1">
            <CountrySelect
              label={t("listings.country")}
              value={draft.country}
              onChange={(code) => updateDraft("country", code)}
            />
          </div>
          {draft.country ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label={t("listings.clearCountry")}
              onClick={() => updateDraft("country", "")}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Renders geolocation trigger, radius filter, and clear/submit buttons. */
function SearchActions({
  draft,
  updateDraft,
  clearLocation,
  useMyLocation,
  clearAll,
  isDirty,
  locating,
  hasGeoDraft,
  t,
  embedded,
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        embedded ? "border-t border-border/40 pt-3" : "border-t pt-4"
      )}
    >
      {!hasGeoDraft ? (
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
          {locating ? (
            <Loader2 className="me-2 size-4 animate-spin" />
          ) : (
            <MapPin className="me-2 size-4" />
          )}
          {t("listings.useMyLocation")}
        </Button>
      ) : (
        <>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 text-primary" />
            {t("listings.locationActive")}
          </span>
          <div className="space-y-1">
            <Label className="sr-only">{t("listings.radius")}</Label>
            <Select value={draft.radiusKm} onValueChange={(v) => updateDraft("radiusKm", v)}>
              <SelectTrigger className="h-9 w-[120px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((km) => (
                  <SelectItem key={km} value={String(km)}>
                    {t(`listings.radiusOptions.${km}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={clearLocation}>
            <X className="me-1 size-4" />
            {t("listings.clearLocation")}
          </Button>
        </>
      )}

      <div className="ms-auto flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={clearAll}>
          {t("listings.clearFilters")}
        </Button>
        <Button type="submit" size="sm" className="gap-2" disabled={!isDirty}>
          <Search className="size-4" />
          {t("listings.search")}
        </Button>
      </div>
    </div>
  );
}

function ListingSearchForm({ applied, embedded }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState(applied);
  const [locating, setLocating] = useState(false);

  const isDirty = !filtersEqual(draft, applied);
  const hasGeoDraft = Boolean(draft.lat && draft.lng);

  function updateDraft(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function applySearch() {
    const next = filtersToSearchParams(draft);
    const qs = next.toString();
    trackEvent(ANALYTICS_EVENTS.LISTING_SEARCH, {
      type: draft.type,
      pet_type: draft.petType,
      country: draft.country,
      has_location: Boolean(draft.lat && draft.lng),
    });
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    setDraft(EMPTY_FILTERS);
    router.push(pathname);
  }

  function clearLocation() {
    setDraft((prev) => ({ ...prev, lat: "", lng: "" }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error(t("listings.locationDenied"));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft((prev) => ({
          ...prev,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
          radiusKm: prev.radiusKm || "25",
        }));
        setLocating(false);
      },
      () => {
        toast.error(t("listings.locationDenied"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (isDirty) applySearch();
  }

  const fields = (
    <form onSubmit={handleSubmit} className="space-y-3">
      <SearchFields draft={draft} updateDraft={updateDraft} t={t} />
      <SearchActions
        draft={draft}
        updateDraft={updateDraft}
        clearLocation={clearLocation}
        useMyLocation={useMyLocation}
        clearAll={clearAll}
        isDirty={isDirty}
        locating={locating}
        hasGeoDraft={hasGeoDraft}
        t={t}
        embedded={embedded}
      />
    </form>
  );

  if (embedded) {
    return fields;
  }

  return (
    <Card>
      <CardContent className="pt-6">{fields}</CardContent>
    </Card>
  );
}

export function ListingSearch({ embedded = false }) {
  const params = useSearchParams();
  const applied = useMemo(() => filtersFromParams(params), [params]);
  const formKey = params.toString();

  return <ListingSearchForm key={formKey} applied={applied} embedded={embedded} />;
}
