"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LISTING_TYPES, MIN_LISTING_IMAGES, PET_TYPES } from "@/config/constants/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUploader } from "./image-uploader";
import { CreateListingSidebar } from "./create-listing-sidebar";
import { LocationPickerMap } from "@/components/map/location-picker";
import { CountrySelect } from "@/components/form/country-select";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";
import { createListing } from "@/lib/actions/listings";
import { hasSetCoordinates } from "@/lib/geo";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

/** Step 1: pet details · Step 2: photos + contact · Step 3: location */
const STEPS = ["details", "photos", "location"];

const CREATE_ERROR_KEYS = {
  contact_required: "contactRequired",
  images_required: "imagesRequired",
  invalid_coordinates: "locationRequired",
  create_failed: "createFailed",
};

export function CreateListingForm({ locale, defaultType }) {
  const t = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [form, setForm] = useState({
    type: defaultType || "missing",
    images: [],
    petType: "dog",
    breed: "",
    color: "",
    description: "",
    address: "",
    city: "",
    country: "",
    lng: null,
    lat: null,
    locationSource: "manual",
    allowEmail: true,
    allowPhone: false,
  });

  const stepLabels = Object.fromEntries(
    STEPS.map((s) => [s, t(`listings.steps.${s}`)])
  );

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateCoordinates(lat, lng, source = "manual") {
    setForm((f) => ({ ...f, lat, lng, locationSource: source }));
  }

  function handleReverseGeocode(data) {
    setForm((f) => ({
      ...f,
      address: data.address || f.address,
      city: data.city || f.city,
      country: data.country || f.country,
    }));
  }

  async function reverseGeocodeFromCoords(lat, lng) {
    if (!hasSetCoordinates(lng, lat)) return;
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      if (res.ok) handleReverseGeocode(await res.json());
    } catch {
      // Best-effort address pre-fill
    }
  }

  function handleMapCoordinatesChange(lat, lng) {
    updateCoordinates(lat, lng, "manual");
    reverseGeocodeFromCoords(lat, lng);
  }

  /** Auto-apply GPS from photo EXIF when location is not set yet. */
  function handleGpsFromPhoto({ lat, lng }) {
    let applied = false;
    setForm((f) => {
      if (hasSetCoordinates(f.lng, f.lat)) return f;
      applied = true;
      return { ...f, lat, lng, locationSource: "exif" };
    });
    if (applied) {
      reverseGeocodeFromCoords(lat, lng);
      toast.success(t("listings.locationFromPhoto"));
    }
  }

  function validateStep(index) {
    switch (index) {
      case 0:
        if (!form.color.trim()) {
          toast.error(t("listings.colorRequired"));
          return false;
        }
        return true;
      case 1:
        if (form.images.length < MIN_LISTING_IMAGES) {
          toast.error(t("listings.imagesHint"));
          return false;
        }
        if (!form.allowEmail && !form.allowPhone) {
          toast.error(t("listings.contactRequired"));
          return false;
        }
        return true;
      case 2:
        if (!hasSetCoordinates(form.lng, form.lat)) {
          toast.error(t("listings.locationRequired"));
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (submittingRef.current || loading) return;
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const result = await createListing(form);

      if (result.error) {
        const key = CREATE_ERROR_KEYS[result.error];
        toast.error(key ? t(`listings.createErrors.${key}`) : result.error);
        return;
      }

      if (!result.id) {
        toast.error(t("listings.createErrors.createFailed"));
        return;
      }

      if (result.processingWarning) {
        toast.warning(t("listings.createdProcessingDelayed"));
      } else {
        toast.success(t("listings.created"));
      }

      trackEvent(ANALYTICS_EVENTS.LISTING_CREATE, {
        type: form.type,
        pet_type: form.petType,
      });

      router.push(`/${locale}/listings/${result.id}`);
      router.refresh();
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  const locationFromPhoto = form.locationSource === "exif" && hasSetCoordinates(form.lng, form.lat);

  return (
    <Card className="w-full max-w-[58rem] overflow-hidden shadow-lg">
      <div className="grid md:grid-cols-[minmax(220px,28%)_1fr]">
        <CreateListingSidebar steps={STEPS} currentStep={step} labels={stepLabels} />

        <CardContent className="flex flex-col gap-6 p-6 md:p-10">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("listings.type")}</Label>
                <Select value={form.type} onValueChange={(v) => update("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`listingTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("listings.petType")}</Label>
                <Select value={form.petType} onValueChange={(v) => update("petType", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
              <div className="space-y-2">
                <Label>{t("listings.color")} *</Label>
                <Input
                  value={form.color}
                  onChange={(e) => update("color", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t("listings.breed")} ({t("common.optional")})
                </Label>
                <Input value={form.breed} onChange={(e) => update("breed", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>
                  {t("listings.description")} ({t("common.optional")})
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <ImageUploader
                images={form.images}
                onChange={(imgs) => update("images", imgs)}
                hint={t("listings.imagesHint")}
                onGpsFound={handleGpsFromPhoto}
              />

              <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">{t("listings.contactHint")}</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="email"
                    checked={form.allowEmail}
                    onCheckedChange={(v) => update("allowEmail", !!v)}
                  />
                  <Label htmlFor="email" className="font-normal">
                    {t("listings.allowEmail")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="phone"
                    checked={form.allowPhone}
                    onCheckedChange={(v) => update("allowPhone", !!v)}
                  />
                  <Label htmlFor="phone" className="font-normal">
                    {t("listings.allowPhone")}
                  </Label>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {locationFromPhoto && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                  <MapPin className="size-4 shrink-0" />
                  {t("listings.locationFromPhotoHint")}
                </div>
              )}

              <LocationPickerMap
                lat={form.lat}
                lng={form.lng}
                onCoordinatesChange={handleMapCoordinatesChange}
                onReverseGeocode={handleReverseGeocode}
              />

              <p className="text-xs text-muted-foreground">{t("listings.mapPickerHint")}</p>

              <div className="space-y-2">
                <Label>
                  {t("listings.address")} ({t("common.optional")})
                </Label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("listings.city")}</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
              </div>
              <CountrySelect
                label={t("listings.country")}
                value={form.country}
                onChange={(code) => update("country", code)}
              />
            </div>
          )}

          <div className="mt-auto flex justify-between border-t pt-4">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={goBack} disabled={loading}>
                {t("common.back")}
              </Button>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext} disabled={loading}>
                {t("common.next")}
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? t("common.loading") : t("common.submit")}
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
