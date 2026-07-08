"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { CreateListingSidebar } from "./create-listing-sidebar";
import {
  CreateListingDetailsStep,
  CreateListingLocationStep,
  CreateListingPhotosStep,
  CreateListingStepActions,
  MIN_LISTING_IMAGES,
} from "./create-listing-steps";
import { createListing } from "@/lib/actions/listings";
import { hasSetCoordinates } from "@/lib/geo";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

/** Listing creation wizard: pet details, photos and contact, then location. */
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
          {step === 0 && <CreateListingDetailsStep form={form} update={update} t={t} />}
          {step === 1 && (
            <CreateListingPhotosStep
              form={form}
              update={update}
              t={t}
              onGpsFound={handleGpsFromPhoto}
            />
          )}
          {step === 2 && (
            <CreateListingLocationStep
              form={form}
              update={update}
              t={t}
              locationFromPhoto={locationFromPhoto}
              onCoordinatesChange={handleMapCoordinatesChange}
              onReverseGeocode={handleReverseGeocode}
            />
          )}

          <CreateListingStepActions
            step={step}
            stepCount={STEPS.length}
            loading={loading}
            t={t}
            onBack={goBack}
            onNext={goNext}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </div>
    </Card>
  );
}
