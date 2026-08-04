"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PET_TYPES } from "@/config/constants/enums";
import { shouldClearBreedForPetType } from "@/config/pet-attributes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreedSuggest, ColorSuggest } from "@/components/form/breed-color-suggest";
import { PetPhotosUpload } from "./pet-photos-upload";
import { PetPassportUpload } from "./pet-passport-upload";
import { createOwnedPet, updateOwnedPet } from "@/lib/actions/owned-pets";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";

const ERROR_KEYS = {
  INVALID_MICROCHIP: "invalidMicrochip",
  MICROCHIP_DUPLICATE: "microchipDuplicate",
  MAX_PETS_REACHED: "maxPetsReached",
  PHOTO_REQUIRED: "photoRequired",
  NOT_FOUND: "notFound",
  CANNOT_EDIT_ARCHIVED: "cannotEditArchived",
};

export function PetForm({ locale, pet = null }) {
  const t = useTranslations("myPets");
  const tCommon = useTranslations("common");
  const tPetTypes = useTranslations("petTypes");
  const tBreeds = useTranslations("breeds");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: pet?.name || "",
    microchipId: pet?.microchipId || "",
    petType: pet?.petType || "dog",
    breed: pet?.breed || "",
    color: pet?.color || "",
    description: pet?.description || "",
    photo: pet?.photo || null,
    photo2: pet?.photo2 || null,
    passportPhoto: pet?.passportPhoto || null,
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updatePetType(nextType) {
    setForm((f) => {
      const next = { ...f, petType: nextType };
      if (shouldClearBreedForPetType(f.breed, nextType, (key) => tBreeds(key))) {
        next.breed = "";
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name || !form.microchipId || !form.color || !form.photo) {
      toast.error(t("fillRequired"));
      return;
    }

    setLoading(true);
    const result = pet
      ? await updateOwnedPet(pet.publicId, form)
      : await createOwnedPet(form);
    setLoading(false);

    if (result.error) {
      const key = ERROR_KEYS[result.error];
      toast.error(key ? t(key) : result.error);
      return;
    }

    toast.success(pet ? t("updated") : t("created"));
    router.push(`/${locale}/account/pets/${result.id || pet.publicId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link
        href={pet ? `/${locale}/account/pets/${pet.publicId}` : `/${locale}/account/pets`}
        className="inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← {pet ? t("backToPet") : t("backToPets")}
      </Link>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>{pet ? t("editPet") : t("addPet")}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-start">
              {/* Details column */}
              <div className="order-2 space-y-4 lg:order-1">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t("name")} *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t("microchipId")} *</Label>
                    <Input
                      value={form.microchipId}
                      onChange={(e) => update("microchipId", e.target.value)}
                      placeholder="900123456789012"
                      className="font-mono"
                      required
                    />
                    <p className="text-xs text-muted-foreground">{t("microchipHint")}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("petType")} *</Label>
                    <Select value={form.petType} onValueChange={updatePetType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PET_TYPES.map((pt) => (
                          <SelectItem key={pt} value={pt}>
                            <span className="flex items-center gap-2">
                              <PetTypeIcon type={pt} />
                              {tPetTypes(pt)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("color")} *</Label>
                    <ColorSuggest
                      value={form.color}
                      onChange={(v) => update("color", v)}
                      required
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>
                      {t("breed")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({tCommon("optional")})
                      </span>
                    </Label>
                    <BreedSuggest
                      value={form.breed}
                      onChange={(v) => update("breed", v)}
                      petType={form.petType}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>
                      {t("description")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({tCommon("optional")})
                      </span>
                    </Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <PetPassportUpload
                      passportPhoto={form.passportPhoto}
                      onChange={(img) => update("passportPhoto", img)}
                    />
                  </div>
                </div>
              </div>

              {/* Photos column — sticky on desktop */}
              <div className="order-1 lg:sticky lg:top-6 lg:order-2">
                <PetPhotosUpload
                  photo={form.photo}
                  photo2={form.photo2}
                  onPhotoChange={(img) => update("photo", img)}
                  onPhoto2Change={(img) => update("photo2", img)}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 border-t pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
