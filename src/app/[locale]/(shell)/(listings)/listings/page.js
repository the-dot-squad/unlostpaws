import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { searchListings } from "@/lib/listings/search";
import { ListingSearch } from "@/components/listings/listing-search";
import { ListingCard } from "@/components/listings/listing-card";
import { ListingsPagination } from "@/components/listings/listings-pagination";
import { EmptyState } from "@/components/marketing/empty-state";
import { PageHeader } from "@/components/marketing/page-header";
import { ContentBody } from "@/components/marketing/content-page";
import { Button } from "@/components/ui/button";
import { FilePlus2, PawPrint } from "lucide-react";
import { LISTINGS_PAGE_SIZE } from "@/config/constants/platform";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { listingsFeedDiscoveryUrl } from "@/lib/feeds/listings";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const metadata = buildPageMetadata({
    locale,
    title: t("listingsTitle"),
    description: t("listingsDescription"),
    path: "listings",
  });

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: {
        "application/rss+xml": listingsFeedDiscoveryUrl(locale),
        "application/atom+xml": listingsFeedDiscoveryUrl(locale, {}, "atom"),
      },
    },
  };
}

export default async function ListingsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const sp = await searchParams;
  const prefix = `/${locale}`;
  const pathname = `${prefix}/listings`;

  const requestedPage = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);

  const searchInput = {
    type: sp.type,
    petType: sp.petType,
    color: sp.color,
    breed: sp.breed,
    country: sp.country,
    lng: sp.lng ? parseFloat(sp.lng) : undefined,
    lat: sp.lat ? parseFloat(sp.lat) : undefined,
    radiusKm: sp.radiusKm ? parseFloat(sp.radiusKm) : undefined,
    q: sp.q,
    page: requestedPage,
    limit: LISTINGS_PAGE_SIZE,
  };

  let { listings, total, page, totalPages } = await searchListings(searchInput);

  if (total > 0 && requestedPage > totalPages) {
    ({ listings, total, page, totalPages } = await searchListings({
      ...searchInput,
      page: totalPages,
    }));
  }

  const from = total === 0 ? 0 : (page - 1) * LISTINGS_PAGE_SIZE + 1;
  const to = total === 0 ? 0 : from + listings.length - 1;

  return (
    <>
      <PageHeader
        title={t("listings.title")}
        description={t("listings.heroSubtitle")}
        icon={PawPrint}
        actions={
          <Button className="gap-2" asChild>
            <Link href={`${prefix}/listings/new`}>
              <FilePlus2 className="size-4" />
              {t("nav.createListing")}
            </Link>
          </Button>
        }
      >
        <ListingSearch embedded />
      </PageHeader>

      <ContentBody wide className="py-6 md:py-8">
        {total > 0 && (
          <p className="mb-4 text-sm text-muted-foreground">
            {t("listings.resultsSummary", { from, to, total })}
          </p>
        )}

        {listings.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title={t("listings.noResultsTitle")}
            description={t("listings.noResultsDescription")}
            actionLabel={t("listings.noResultsAction")}
            actionHref={`${prefix}/listings/new?type=missing`}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing._id.toString()}
                  listing={listing}
                  locale={locale}
                  typeLabel={t(`listingTypes.${listing.type}`)}
                  petTypeLabel={t(`petTypes.${listing.petType}`)}
                  processingLabel={
                    listing.processingStatus && listing.processingStatus !== "ready"
                      ? t(`listings.processing.${listing.processingStatus}`)
                      : undefined
                  }
                />
              ))}
            </div>

            <ListingsPagination
              pathname={pathname}
              searchParams={sp}
              page={page}
              totalPages={totalPages}
            />
          </>
        )}
      </ContentBody>
    </>
  );
}
