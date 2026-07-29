import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getListingForPage } from "@/lib/services/listings";
import { PrintableFlyer } from "@/components/flyer/printable-flyer";
import { AutoPrintController } from "@/components/flyer/auto-print-controller";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listingPublicId } from "@/models/listing";
import { getAuthUserById } from "@/lib/auth/users";

export async function generateMetadata({ params }) {
  const { locale, id } = await params;
  const listing = await getListingForPage(id);
  if (!listing) return {};

  return {
    title: `Print Poster — ${listing.type.toUpperCase()} ${listing.petType} (${listing.color}) | UnLostPaws`,
    robots: { index: false, follow: false },
  };
}

export default async function ListingFlyerPrintPage({ params, searchParams }) {
  const { locale, id } = await params;
  const { img, headline, notes, phone, email, print } = await searchParams;

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "flyer" });

  const listing = await getListingForPage(id);
  if (!listing) notFound();

  // Fetch owner user details to obtain email and phone
  const ownerUser = await getAuthUserById(listing.userId);

  const slug = listing.publicId || listingPublicId(listing);
  const selectedImageIndex = img ? parseInt(img, 10) || 0 : 0;
  const showPhone = phone !== "0";
  const showEmail = email !== "0";
  const shouldAutoPrint = print === "true";

  // Convert listing to plain JSON object with populated contact info and publicId slug
  const plainListing = {
    ...JSON.parse(JSON.stringify(listing)),
    publicId: slug,
    contactPhone: ownerUser?.phone || ownerUser?.phoneNumber || listing.contactPhone || "",
    contactEmail: ownerUser?.email || listing.contactEmail || "",
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0 print:m-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              header, footer, nav, [data-site-header], [data-site-footer] {
                display: none !important;
              }
              body, html {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                size: A4 portrait;
                margin: 5mm;
              }
              .printable-poster {
                box-shadow: none !important;
                border: none !important;
                max-width: 100% !important;
                width: 100% !important;
              }
            }
          `,
        }}
      />
      {/* Top Action Toolbar (Hidden when printing) */}
      <div className="mx-auto max-w-[210mm] mb-6 flex items-center justify-between print:hidden">
        <Link href={`/${locale}/listings/${slug}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-slate-700">
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t("backToListing") || "Back to Listing"}
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <AutoPrintController
            autoPrint={shouldAutoPrint}
            printLabel={t("printButton") || "Print Poster / Save PDF"}
          />
        </div>
      </div>

      {/* Main Printable Poster */}
      <main>
        <PrintableFlyer
          listing={plainListing}
          locale={locale}
          selectedImageIndex={selectedImageIndex}
          customHeadline={headline}
          customNotes={notes}
          showPhone={showPhone}
          showEmail={showEmail}
        />
      </main>
    </div>
  );
}
