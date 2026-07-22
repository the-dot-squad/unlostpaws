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

const STEPS = ["details", "photos", "location"];

const CREATE_ERROR_KEYS = {
  contact_required: "contactRequired",
  images_required: "imagesRequired",
  invalid_coordinates: "locationRequired",
  create_failed: "createFailed",
  listing_limit_daily: "listingLimitDaily",
  listing_limit_monthly: "listingLimitMonthly",
  upload_daily_limit: "uploadDailyLimit",
  rate_limit_exceeded: "rateLimitExceeded",
  user_banned: "userBanned",
};

/** Validates each step input for creating listing. */
function validateCreateListingStep(step, form, uploadBlocked, t) {
  switch (step) {
    case 0:
      if (!form.color.trim()) {
        toast.error(t("listings.colorRequired"));
        return false;
      }
      return true;
    case 1:
      if (uploadBlocked) return false;
      if (form.images.length < MIN_LISTING_IMAGES) {
        toast.error(t("listings.createErrors.imagesRequired"));
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

/** Pre-fills city/country/address using latitude and longitude coordinates. */
async function fetchReverseGeocode(lat, lng) {
  if (!hasSetCoordinates(lng, lat)) return null;
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    if (res.ok) return await res.json();
  } catch {
    // Best-effort
  }
  return null;
}

/** Handles API submission and error-mapping to translation keys. */
async function submitListing(form, locale, t) {
  try {
    const result = await createListing({ ...form, locale });
    if (result.error) {
      const key = CREATE_ERROR_KEYS[result.error];
      return { success: false, error: key ? t(`listings.createErrors.${key}`) : result.error };
    }
    if (!result.id) {
      return { success: false, error: t("listings.createErrors.createFailed") };
    }
    return { success: true, id: result.id, processingFailed: result.processingFailed };
  } catch (err) {
    console.error(err);
    return { success: false, error: t("listings.createErrors.createFailed") };
  }
}

/** Custom hook containing form state, validation, geolocation helpers, and submission logic. */
function useCreateListingState({ locale, defaultType }) {
  const t = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadBlocked, setUploadBlocked] = useState(false);
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
    const data = await fetchReverseGeocode(lat, lng);
    if (data) handleReverseGeocode(data);
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

  function handleUploadBlocked(blocked, info) {
    setUploadBlocked(blocked);
    if (blocked && info?.message) {
      toast.error(info.message);
    }
  }

  function goNext() {
    if (uploadBlocked) return;
    if (!validateCreateListingStep(step, form, uploadBlocked, t)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (submittingRef.current || loading || uploadBlocked) return;
    if (
      !validateCreateListingStep(0, form, uploadBlocked, t) ||
      !validateCreateListingStep(1, form, uploadBlocked, t) ||
      !validateCreateListingStep(2, form, uploadBlocked, t)
    ) {
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    const res = await submitListing(form, locale, t);
    if (!res.success) {
      toast.error(res.error);
      submittingRef.current = false;
      setLoading(false);
      return;
    }

    if (res.processingFailed) {
      toast.warning(t("listings.createdProcessingFailed"));
    } else {
      toast.success(t("listings.created"));
    }

    trackEvent(ANALYTICS_EVENTS.LISTING_CREATE, {
      type: form.type,
      pet_type: form.petType,
    });

    router.push(`/${locale}/listings/${res.id}`);
    router.refresh();
  }

  const locationFromPhoto = form.locationSource === "exif" && hasSetCoordinates(form.lng, form.lat);

  return {
    step,
    loading,
    uploadBlocked,
    form,
    stepLabels,
    locationFromPhoto,
    update,
    goBack,
    goNext,
    handleSubmit,
    handleGpsFromPhoto,
    handleUploadBlocked,
    handleMapCoordinatesChange,
    handleReverseGeocode,
  };
}

export function CreateListingForm({ locale, defaultType }) {
  const t = useTranslations();
  const state = useCreateListingState({ locale, defaultType });

  return (
    <Card className="w-full max-w-[58rem] overflow-hidden shadow-lg">
      <div className="grid md:grid-cols-[minmax(220px,28%)_1fr]">
        <CreateListingSidebar steps={STEPS} currentStep={state.step} labels={state.stepLabels} />

        <CardContent className="flex flex-col gap-6 p-6 md:p-10">
          {state.step === 0 && <CreateListingDetailsStep form={state.form} update={state.update} t={t} />}
          {state.step === 1 && (
            <CreateListingPhotosStep
              form={state.form}
              update={state.update}
              t={t}
              onGpsFound={state.handleGpsFromPhoto}
              onUploadBlockedChange={state.handleUploadBlocked}
            />
          )}
          {state.step === 2 && (
            <CreateListingLocationStep
              form={state.form}
              update={state.update}
              t={t}
              locationFromPhoto={state.locationFromPhoto}
              onCoordinatesChange={state.handleMapCoordinatesChange}
              onReverseGeocode={state.handleReverseGeocode}
            />
          )}

          <CreateListingStepActions
            step={state.step}
            stepCount={STEPS.length}
            loading={state.loading}
            disabled={state.uploadBlocked}
            t={t}
            onBack={state.goBack}
            onNext={state.goNext}
            onSubmit={state.handleSubmit}
          />
        </CardContent>
      </div>
    </Card>
  );
}
