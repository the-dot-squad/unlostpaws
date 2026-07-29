import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/config/db";
import { Listing, attachListingPublicId } from "@/models/listing";
import { ListingCard } from "@/components/listings/listing-card";
import { daysUntilExpiry } from "@/lib/listings/expiry";

export default async function MyListingsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getSession();

  await connectDB();
  const listings = (
    await Listing.find({ userId: session.user.id, status: { $ne: "removed" } }).sort({ createdAt: -1 }).lean()
  ).map(attachListingPublicId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.myListings")}</h1>
        <p className="mt-1 text-muted-foreground">{t("account.listingsSubtitle")}</p>
      </div>
      {listings.length === 0 ? (
        <p className="text-muted-foreground">{t("account.noListings")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const isActive = listing.status === "active";
            const daysLeft = isActive ? daysUntilExpiry(listing.expiresAt) : 0;
            const listingWithContact = {
              ...listing,
              contactPhone: session?.user?.phone || session?.user?.phoneNumber || listing.contactPhone || "",
              contactEmail: session?.user?.email || listing.contactEmail || "",
            };

            return (
              <ListingCard
                key={listing._id.toString()}
                listing={listingWithContact}
                locale={locale}
                owner
                typeLabel={t(`listingTypes.${listing.type}`)}
                petTypeLabel={t(`petTypes.${listing.petType}`)}
                processingLabel={
                  listing.processingStatus && listing.processingStatus !== "ready"
                    ? t(`listings.processing.${listing.processingStatus}`)
                    : undefined
                }
                statusLabel={
                  !isActive ? t(`listings.status.${listing.status}`) : undefined
                }
                daysRemainingLabel={
                  isActive && daysLeft > 0
                    ? t("account.daysRemaining", { count: daysLeft })
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
