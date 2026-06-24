"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelect } from "@/components/form/country-select";
import { LocationPickerMap } from "@/components/map/location-picker";
import { updateListing } from "@/lib/actions/listings";
import { ListingExtensionPanel } from "@/components/listings/listing-extension-panel";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { hasSetCoordinates } from "@/lib/geo";

/**
 * Owner-only form to update editable listing fields (not photos or alert type).
 */
export function ListingEditForm({ locale, listingId, listing, extensionPolicy, extensionLocked }) {
  const t = useTranslations();
  const router = useRouter();
  const submittingRef = useRef(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    color: listing.color || "",
    breed: listing.breed || "",
    description: listing.description || "",
    address: listing.location?.address || "",
    city: listing.location?.city || "",
    country: listing.location?.country || "",
    lng: listing.location?.lng ?? null,
    lat: listing.location?.lat ?? null,
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleReverseGeocode(data) {
    setForm((f) => ({
      ...f,
      address: data.address || f.address,
      city: data.city || f.city,
      country: data.country || f.country,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;

    if (!form.color.trim()) {
      toast.error(t("listings.colorRequired"));
      return;
    }

    if (!hasSetCoordinates(form.lng, form.lat)) {
      toast.error(t("listings.locationRequired"));
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const result = await updateListing(listingId, form);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("common.success"));
      router.push(`/${locale}/listings/${listingId}`);
      router.refresh();
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <SiteContainer className="max-w-2xl space-y-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("listings.editListing")}</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/listings/${listingId}`}>{t("common.cancel")}</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="color">{t("listings.color")}</Label>
              <Input
                id="color"
                value={form.color}
                onChange={(e) => update("color", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="breed">
                {t("listings.breed")} ({t("common.optional")})
              </Label>
              <Input
                id="breed"
                value={form.breed}
                onChange={(e) => update("breed", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t("listings.description")} ({t("common.optional")})
              </Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
              />
            </div>

            {extensionPolicy ? (
              <ListingExtensionPanel
                listingId={listingId}
                listing={listing}
                extensionPolicy={extensionPolicy}
                extensionLocked={extensionLocked}
              />
            ) : null}

            <div className="space-y-4 border-t pt-6">
              <p className="text-sm font-medium">{t("listings.location")}</p>

              <LocationPickerMap
                lat={form.lat}
                lng={form.lng}
                onCoordinatesChange={(nextLat, nextLng) => {
                  setForm((f) => ({ ...f, lat: nextLat, lng: nextLng }));
                }}
                onReverseGeocode={handleReverseGeocode}
              />

              <div className="space-y-2">
                <Label htmlFor="address">
                  {t("listings.address")} ({t("common.optional")})
                </Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t("listings.city")}</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
              <CountrySelect
                label={t("listings.country")}
                value={form.country}
                onChange={(code) => update("country", code)}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-6">
              <DeleteListingButton listingId={listingId} locale={locale} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href={`/${locale}/listings/${listingId}`}>{t("common.cancel")}</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? t("common.loading") : t("listings.saveChanges")}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </SiteContainer>
  );
}
