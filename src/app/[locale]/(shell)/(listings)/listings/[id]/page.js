import { notFound } from "next/navigation";
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { getCountryName } from "@/config/countries";
import { getListingForPage } from "@/lib/services/listings";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getListingJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ReportDialog } from "@/components/listings/report-dialog";
import { ProcessingStatusBadge } from "@/components/listings/processing-status-badge";
import { ResolveButton } from "@/components/listings/resolve-button";
import { ShareButton } from "@/components/listings/share-button";
import { ListingImageGallery } from "@/components/listings/listing-image-gallery";
import { ListingLocationSection } from "@/components/listings/listing-location-section";
import { ListingMetadataBox } from "@/components/listings/listing-metadata-box";
import { ListingEditForm } from "@/components/listings/listing-edit-form";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";
import { Pencil } from "lucide-react";
import { SiteContainer } from "@/components/layout/site-container";
import { getAuthUserById } from "@/lib/auth/users";
import { userPublicPath } from "@/lib/public-id";
import {
  serializeListingImages,
  serializeListingLocation,
} from "@/models/listing";
import { getAppSettings } from "@/lib/services/settings";
import { serializeExtensionPolicy } from "@/lib/listings/expiry";
import { hasReunionExtensionLock } from "@/lib/intelligence/matching/reunion";

export async function generateMetadata({ params }) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const tTypes = await getTranslations({ locale, namespace: "listingTypes" });
  const tPetTypes = await getTranslations({ locale, namespace: "petTypes" });

  const listing = await getListingForPage(id);
  if (!listing) return {};

  const city = listing.location?.city || "";
  const country = getCountryName(listing.location?.country, locale);
  const location = [city, country].filter(Boolean).join(", ") || "—";
  const typeLabel = tTypes(listing.type);
  const petTypeLabel = tPetTypes(listing.petType);
  const title = t("listingDetailTitle", {
    type: typeLabel,
    color: listing.color || "—",
    petType: petTypeLabel,
    location,
  });
  const description = t("listingDetailDescription", {
    type: typeLabel,
    petType: petTypeLabel,
    location,
  });
  return buildPageMetadata({
    locale,
    title,
    description,
    path: `listings/${id}`,
  });
}

export default async function ListingDetailPage({ params, searchParams }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getSession();
  const sp = await searchParams;

  const listing = await getListingForPage(id);
  if (!listing) notFound();

  const isOwner = session?.user?.id === listing.userId;
  const isStaff = session?.user?.role === "admin" || session?.user?.role === "moderator";
 
  if (listing.status === "removed" && !isOwner && !isStaff) {
    notFound();
  }
  const prefix = `/${locale}`;
  const location = serializeListingLocation(listing.location);
  const countryLabel = getCountryName(location?.country || listing.location?.country, locale);
  const images = serializeListingImages(listing.images);
  const petTypeLabel = t(`petTypes.${listing.petType}`);

  const ownerUser = await getAuthUserById(listing.userId);
  const owner = ownerUser
    ? {
        name: ownerUser.name,
        image: ownerUser.image,
        countryLabel: getCountryName(ownerUser.country, locale),
        profileHref: ownerUser.publicId ? userPublicPath(ownerUser.publicId, locale) : null,
      }
    : null;

  // Owner edit mode (?edit=1)
  if (isOwner && sp.edit === "1" && listing.status === "active") {
    const settings = await getAppSettings();
    const extensionLocked = await hasReunionExtensionLock(listing._id);
    return (
      <ListingEditForm
        locale={locale}
        listingId={id}
        listing={{
          status: listing.status,
          expiresAt: listing.expiresAt,
          color: listing.color,
          breed: listing.breed,
          description: listing.description,
          location,
        }}
        extensionPolicy={serializeExtensionPolicy(settings)}
        extensionLocked={extensionLocked}
      />
    );
  }

  const showContact =
    listing.status === "active" && !isOwner;
  const canEdit = isOwner && listing.status === "active";

  const city = location?.city || "";
  const locationLabel = [city, countryLabel].filter(Boolean).join(", ");
  const typeLabel = t(`listingTypes.${listing.type}`);
  const description = t("seo.listingDetailDescription", {
    type: typeLabel,
    petType: petTypeLabel,
    location: locationLabel || "—",
  });
  const listingTitle = t("seo.listingDetailTitle", {
    type: typeLabel,
    color: listing.color || "—",
    petType: petTypeLabel,
    location: locationLabel || "—",
  });

  const jsonLd = getListingJsonLd({
    listing,
    locale,
    typeLabel,
    petTypeLabel,
    locationLabel,
    description,
    title: listingTitle,
  });

  return (
    <SiteContainer className="max-w-4xl space-y-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {/* Review / duplicate warnings */}
      {listing.status === "under_review" && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm">
          {t("listings.duplicateWarning")}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t(`listingTypes.${listing.type}`)}</Badge>
            <Badge variant="secondary" className="gap-1.5 capitalize">
              <PetTypeIcon type={listing.petType} className="size-3.5" />
              {petTypeLabel}
            </Badge>
            <Badge variant="outline">{t(`listings.status.${listing.status}`)}</Badge>
            {isOwner && (
              <ProcessingStatusBadge
                status={listing.processingStatus}
                label={
                  listing.processingStatus
                    ? t(`listings.processing.${listing.processingStatus}`)
                    : ""
                }
              />
            )}
          </div>

          <h1 className="text-2xl font-bold capitalize">
            {petTypeLabel} — {listing.color}
          </h1>
          {listing.breed ? (
            <p className="text-muted-foreground">{listing.breed}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <ShareButton
            typeLabel={t(`listingTypes.${listing.type}`)}
            petTypeLabel={petTypeLabel}
            color={listing.color}
            breed={listing.breed}
            locationLabel={locationLabel}
          />
          {!isOwner && listing.status === "active" && (
            <ReportDialog
              listingId={id}
              isSignedIn={Boolean(session)}
              signInHref={`${prefix}/sign-in`}
            />
          )}
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`${prefix}/listings/${id}?edit=1`}>
                <Pencil className="me-2 size-4" />
                {t("listings.editListing")}
              </Link>
            </Button>
          )}
          {isOwner && listing.status === "active" && (
            <ResolveButton listingId={id} />
          )}
        </div>
      </div>

      {/* Photos */}
      <ListingImageGallery images={images} altPrefix={petTypeLabel} />

      {/* Poster, timestamps, and contact */}
      <ListingMetadataBox
        locale={locale}
        createdAt={listing.createdAt}
        updatedAt={listing.updatedAt}
        owner={owner}
        listingId={id}
        showContact={showContact}
      />

      {/* Description and location */}
      {(listing.description || location) && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            {listing.description ? (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">
                  {t("listings.description")}
                </h2>
                <p className="mt-2 whitespace-pre-wrap">{listing.description}</p>
              </div>
            ) : null}

            {location ? (
              <>
                {listing.description ? <Separator /> : null}
                <ListingLocationSection
                  address={location.address}
                  city={location.city}
                  countryLabel={countryLabel}
                  lat={location.lat}
                  lng={location.lng}
                  hasCoords={location.hasCoords}
                  listingType={listing.type}
                />
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
    </SiteContainer>
  );
}
