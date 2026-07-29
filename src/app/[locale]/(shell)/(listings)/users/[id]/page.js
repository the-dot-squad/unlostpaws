import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB } from "@/config/db";
import { Listing, attachListingPublicId } from "@/models/listing";
import { getCountryName } from "@/config/countries";
import { getUserForPage } from "@/lib/services/users";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SiteContainer } from "@/components/layout/site-container";
import { ListingCard } from "@/components/listings/listing-card";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, User } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  const user = await getUserForPage(id);
  const isInactive = user?.status ? user.status !== "active" : user?.banned;
  if (!user || isInactive) return {};

  const name = user.name || "Member";

  return buildPageMetadata({
    locale,
    title: t("userProfileTitle", { name }),
    description: t("userProfileDescription", { name }),
    path: `users/${id}`,
  });
}

export default async function UserProfilePage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const prefix = `/${locale}`;

  const user = await getUserForPage(id);
  const isInactive = user?.status ? user.status !== "active" : user?.banned;
  if (!user || isInactive) notFound();

  await connectDB();
  const rawListings = await Listing.find({ userId: user.id, status: "active" })
    .sort({ createdAt: -1 })
    .limit(24)
    .lean();
  const listings = JSON.parse(JSON.stringify(rawListings)).map(attachListingPublicId);

  const countryLabel = getCountryName(user.country, locale);
  const locationLine = [user.city, countryLabel].filter(Boolean).join(", ");

  return (
    <SiteContainer className="max-w-5xl space-y-8 py-8">
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-center">
          <UserAvatar name={user.name} imageUrl={user.image} size="lg" />

          <div className="min-w-0 space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <User className="size-3.5" aria-hidden />
              {t("users.member")}
            </p>
            <h1 className="text-2xl font-bold">{user.name || t("listings.anonymousPoster")}</h1>
            {locationLine ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {locationLine}
              </p>
            ) : null}
            {user.createdAt ? (
              <p className="text-sm text-muted-foreground">
                {t("users.memberSince", { date: formatDate(user.createdAt, locale) })}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{t("users.activeListings")}</h2>
          <Link href={`${prefix}/listings`} className="text-sm text-primary hover:underline">
            {t("users.browseAll")}
          </Link>
        </div>

        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("users.noListings")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.publicId}
                listing={listing}
                locale={locale}
                typeLabel={t(`listingTypes.${listing.type}`)}
                petTypeLabel={t(`petTypes.${listing.petType}`)}
              />
            ))}
          </div>
        )}
      </section>
    </SiteContainer>
  );
}
