import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { locale, username } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  const decoded = decodeURIComponent(username || "");
  const clean = decoded.replace(/^@/, "").trim();
  const user = await getUserForPage(clean);
  const isInactive = user?.status ? user.status !== "active" : user?.banned;
  if (!user || isInactive) return {};

  const name = user.name || "Member";
  const canonicalId =
    user.verified && user.handle?.username
      ? user.handle.username
      : user.handle?.publicId || user.publicId;

  return buildPageMetadata({
    locale,
    title: t("userProfileTitle", { name }),
    description: t("userProfileDescription", { name }),
    path: `@${canonicalId}`,
  });
}

export default async function UserProfilePage({ params }) {
  const { locale, username } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const prefix = `/${locale}`;

  const decoded = decodeURIComponent(username || "");
  const clean = decoded.replace(/^@/, "").trim();
  const user = await getUserForPage(clean);
  const isInactive = user?.status ? user.status !== "active" : user?.banned;
  if (!user || isInactive) notFound();

  // Canonical SEO redirection:
  // 1. If verified user has a custom handle, redirect publicId /@usr_... -> /@handle
  // 2. If accessed without leading @ (e.g. /en/davod or /en/usr_...), redirect -> /en/@canonicalId
  const canonicalId =
    user.verified && user.handle?.username
      ? user.handle.username
      : user.handle?.publicId || user.publicId;

  if (decoded !== `@${canonicalId}`) {
    redirect(`/${locale}/@${canonicalId}`);
  }

  await connectDB();
  const rawListings = await Listing.find({ userId: user.id, status: "active" })
    .sort({ createdAt: -1 })
    .limit(24)
    .lean();
  const listings = JSON.parse(JSON.stringify(rawListings)).map(attachListingPublicId);

  const countryLabel = getCountryName(user.country, locale);
  const locationLine = [user.city, countryLabel].filter(Boolean).join(", ");
  const displayHandle =
    user.verified && user.handle?.username
      ? `@${user.handle.username}`
      : `@${user.handle?.publicId || user.publicId}`;

  return (
    <SiteContainer className="max-w-5xl space-y-8 py-8">
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-center">
          <UserAvatar
            name={user.name}
            imageUrl={user.image}
            size="lg"
            verified={Boolean(user.verified)}
          />

          <div className="min-w-0 space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <User className="size-3.5" aria-hidden />
              {user.verified ? t("users.verifiedMember") : t("users.member")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{user.name || t("listings.anonymousPoster")}</h1>
              {user.verified ? (
                <VerifiedBadge size="md" label={t("users.verifiedBadge")} />
              ) : null}
            </div>
            <p
              className={
                user.verified
                  ? "font-mono text-sm font-semibold text-blue-600 dark:text-blue-400"
                  : "font-mono text-xs text-muted-foreground"
              }
            >
              {displayHandle}
            </p>
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
