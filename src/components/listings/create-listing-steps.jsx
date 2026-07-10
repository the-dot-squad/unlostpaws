"use client";

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
import { CountrySelect } from "@/components/form/country-select";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";
import { ImageUploader } from "@/components/listings/image-uploader";
import { LocationPickerMap } from "@/components/map/location-picker";

export function CreateListingDetailsStep({ form, update, t }) {
  return (
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
        <Input value={form.color} onChange={(e) => update("color", e.target.value)} required />
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
  );
}

export function CreateListingPhotosStep({ form, update, t, onGpsFound, onUploadBlockedChange }) {
  return (
    <div className="space-y-6">
      <ImageUploader
        images={form.images}
        onChange={(imgs) => update("images", imgs)}
        hint={t("listings.imagesHint")}
        onGpsFound={onGpsFound}
        onBlockedChange={onUploadBlockedChange}
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
  );
}

export function CreateListingLocationStep({
  form,
  update,
  t,
  locationFromPhoto,
  onCoordinatesChange,
  onReverseGeocode,
}) {
  return (
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
        onCoordinatesChange={onCoordinatesChange}
        onReverseGeocode={onReverseGeocode}
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
  );
}

export function CreateListingStepActions(options) {
  const { step, stepCount, loading, disabled = false, t, onBack, onNext, onSubmit } = options;
  return (
    <div className="mt-auto flex justify-between border-t pt-4">
      {step > 0 ? (
        <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
          {t("common.back")}
        </Button>
      ) : (
        <div />
      )}
      {step < stepCount - 1 ? (
        <Button type="button" onClick={onNext} disabled={loading || disabled}>
          {t("common.next")}
        </Button>
      ) : (
        <Button type="button" onClick={onSubmit} disabled={loading || disabled}>
          {loading ? t("common.loading") : t("common.submit")}
        </Button>
      )}
    </div>
  );
}

export { MIN_LISTING_IMAGES };
