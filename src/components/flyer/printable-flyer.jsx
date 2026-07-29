"use client";

import Image from "next/image";
import { QRCodeDisplay } from "@/components/flyer/qr-code-display";
import { MapPin, Calendar, Phone, Mail, Award, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Splits an address string into detailed line 1 and line 2 for poster printing.
 * @param {string} address
 */
function formatAddressLines(address) {
  if (!address || typeof address !== "string") return { line1: "", line2: "" };
  const trimmed = address.trim();
  if (!trimmed) return { line1: "", line2: "" };

  const parts = trimmed.split(/[\n,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) {
    return { line1: parts[0], line2: "" };
  }
  return {
    line1: parts[0],
    line2: parts.slice(1).join(", "),
  };
}

/**
 * PrintableFlyer Presentation Component
 * Renders an A4 print-optimized poster layout for pet listings.
 */
export function PrintableFlyer({
  listing,
  locale,
  selectedImageIndex = 0,
  customHeadline,
  customNotes,
  showPhone = true,
  showEmail = true,
  t: tProp,
  targetUrl,
}) {
  const flyerT = useTranslations("flyer");
  const tPetTypes = useTranslations("petTypes");
  const t = tProp || flyerT;

  const petTypeLabel = listing.petType ? tPetTypes(listing.petType) || listing.petType : "";

  const images = listing.images || [];
  const selectedImage = images[selectedImageIndex]?.url || images[0]?.url;

  // Resolve Phone and Email from possible listing schema properties
  const displayPhone = listing.contactPhone || listing.contact?.phone || listing.phone || "";
  const displayEmail = listing.contactEmail || listing.contact?.email || listing.email || "";

  // Build canonical URL if not provided
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://unlostpaws.com";
  const slug = listing.publicId || listing._id?.toString() || listing.id || "";
  const qrUrl = targetUrl || `${baseUrl}/${locale}/listings/${slug}`;

  // Format detailed address lines (no city / country)
  const addressLines = formatAddressLines(listing.location?.address);

  const dateFormatted = listing.createdAt
    ? new Date(listing.createdAt).toLocaleDateString(locale === "fa" ? "fa-IR" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Headline Determination
  const defaultHeadlineMap = {
    missing: t("headlineMissing"),
    found: t("headlineFound"),
    spotted: t("headlineSpotted"),
    surrender: t("headlineSurrender"),
  };
  const headline = customHeadline?.trim() || defaultHeadlineMap[listing.type] || t("headlineMissing");

  const isMissing = listing.type === "missing";
  const badgeColorClass = isMissing
    ? "bg-red-600 text-white"
    : listing.type === "found"
    ? "bg-emerald-600 text-white"
    : "bg-blue-600 text-white";

  return (
    <div
      className="printable-poster mx-auto max-w-[210mm] overflow-hidden rounded-2xl border border-border bg-white text-slate-900 shadow-xl print:m-0 print:max-w-none print:rounded-none print:border-none print:shadow-none"
      dir={locale === "fa" ? "rtl" : "ltr"}
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      {/* Top Banner Header */}
      <div
        className={`py-5 px-6 text-center ${badgeColorClass}`}
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <h1 className="text-3xl font-black uppercase tracking-wider md:text-4xl print:text-3xl text-white">
          {headline}
        </h1>
      </div>

      <div className="p-6 md:p-8 space-y-6 print:p-6 print:space-y-5">
        {/* Main Hero Section: Image & Key Highlights */}
        <div className="grid gap-6 md:grid-cols-12 print:grid-cols-12 print:gap-5 items-start">
          {/* Pet Photo Frame */}
          <div className="md:col-span-7 print:col-span-7">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100 shadow-inner">
              {selectedImage ? (
                <Image
                  src={selectedImage}
                  alt={`${listing.type} ${listing.petType}`}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized={process.env.NODE_ENV === "development"}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  No image available
                </div>
              )}
            </div>
          </div>

          {/* Quick Pet Specs Box */}
          <div className="md:col-span-5 print:col-span-5 flex flex-col justify-between space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("details")}
              </div>
              <h2 className="mt-1 text-2xl font-extrabold capitalize text-slate-900">
                {petTypeLabel} {listing.breed ? `· ${listing.breed}` : ""}
              </h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">{t("color") || "Color"}:</span>
                <span className="capitalize text-slate-900">{listing.color}</span>
              </div>

              {/* Detailed Address Lines 1 & 2 */}
              {addressLines.line1 || addressLines.line2 ? (
                <div className="flex items-start gap-2 text-slate-800">
                  <MapPin className="size-4 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <span className="block text-xs font-medium text-slate-500">{t("location")}</span>
                    {addressLines.line1 ? (
                      <p className="font-semibold text-slate-900 leading-tight">{addressLines.line1}</p>
                    ) : null}
                    {addressLines.line2 ? (
                      <p className="text-xs font-medium text-slate-600 mt-0.5">{addressLines.line2}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {dateFormatted ? (
                <div className="flex items-start gap-2 text-slate-800">
                  <Calendar className="size-4 shrink-0 text-blue-500 mt-0.5" />
                  <div>
                    <span className="block text-xs font-medium text-slate-500">{t("date")}</span>
                    <span className="font-semibold">{dateFormatted}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Optional Reward Badge */}
            {isMissing ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-300 p-2.5 text-amber-900 font-bold text-xs uppercase tracking-wide">
                <Award className="size-4 text-amber-600 shrink-0" />
                <span>{t("reward")}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Custom Description & Notes Box */}
        {(customNotes || listing.description) ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <AlertCircle className="size-3.5 text-amber-500" />
              <span>{t("customNotes")}</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-line">
              {customNotes?.trim() || listing.description}
            </p>
          </div>
        ) : null}

        {/* QR Code & Contact Footer Section */}
        <div className="grid gap-6 md:grid-cols-12 print:grid-cols-12 items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
          {/* QR Code Column */}
          <div className="md:col-span-5 print:col-span-5 flex flex-col items-center text-center space-y-2">
            <QRCodeDisplay value={qrUrl} size={150} />
            <p className="text-xs font-medium text-slate-600 max-w-[200px] leading-tight">
              {t("scanCTA")}
            </p>
          </div>

          {/* Contact Details Column */}
          <div className="md:col-span-7 print:col-span-7 space-y-3 border-t md:border-t-0 print:border-t-0 md:border-s print:border-s border-slate-200 pt-4 md:pt-0 print:pt-0 md:ps-6 print:ps-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("contactOwner")}
            </h3>

            <div className="space-y-2">
              {showPhone && displayPhone ? (
                <div className="flex items-center gap-3 text-slate-900">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Phone className="size-4" />
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">{t("phone")}</span>
                    <span className="text-lg font-black tracking-wide">{displayPhone}</span>
                  </div>
                </div>
              ) : null}

              {showEmail && displayEmail ? (
                <div className="flex items-center gap-3 text-slate-900">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">{t("email")}</span>
                    <span className="text-sm font-semibold">{displayEmail}</span>
                  </div>
                </div>
              ) : null}

              {(!showPhone || !displayPhone) && (!showEmail || !displayEmail) ? (
                <p className="text-sm italic text-slate-500">
                  {t("scanToContact") || "Scan QR code above to view live alert & contact creator online."}
                </p>
              ) : null}
            </div>

            {/* Platform Branding */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">UnLostPaws.com</span>
              <span>Reuniting Lost Pets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
