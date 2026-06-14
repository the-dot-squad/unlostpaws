import Link from "next/link";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import { EmptyState } from "./empty-state";
import { HomeSection } from "./home-section";
import { SiteContainer } from "@/components/layout/site-container";

export function RecentAlertsSection({
  locale,
  title,
  subtitle,
  viewAllLabel,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  listings,
  typeLabels,
  petTypeLabels,
  processingLabels,
}) {
  const prefix = `/${locale}`;

  return (
    <HomeSection surface="muted" decor="muted" className="py-16">
      <SiteContainer className="relative">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            <p className="mt-1 text-muted-foreground">{subtitle}</p>
          </div>
          {listings.length > 0 && (
            <Button variant="outline" className="border-border/60 bg-card/80 backdrop-blur-sm" asChild>
              <Link href={`${prefix}/listings`}>{viewAllLabel}</Link>
            </Button>
          )}
        </div>

        {listings.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            actionHref={`${prefix}/listings/new?type=missing`}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing._id.toString()}
                listing={listing}
                locale={locale}
                typeLabel={typeLabels[listing.type]}
                petTypeLabel={petTypeLabels[listing.petType]}
                processingLabel={processingLabels[listing.processingStatus]}
              />
            ))}
          </div>
        )}
      </SiteContainer>
    </HomeSection>
  );
}
