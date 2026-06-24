"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

function MapLoadingSkeleton() {
  const t = useTranslations("map");

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-muted">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {t("loading")}
      </div>
    </div>
  );
}

const ListingsMapClient = dynamic(
  () => import("./listings-map-content").then((m) => m.ListingsMap),
  {
    ssr: false,
    loading: () => <MapLoadingSkeleton />,
  }
);

/**
 * Leaflet map for browsing listings — loaded client-side only (no SSR).
 *
 * @param {Object} props
 * @param {string} props.locale
 * @param {string} [props.type]
 * @param {string} [props.petType]
 */
export function ListingsMap({ locale, type, petType }) {
  return <ListingsMapClient key={`${type}-${petType}`} locale={locale} type={type} petType={petType} />;
}
