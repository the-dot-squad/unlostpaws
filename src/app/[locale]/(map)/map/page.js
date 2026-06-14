import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Map as MapIcon, FilePlus2 } from "lucide-react";
import { MapFilters } from "@/components/map/map-filters";
import { ListingsMap } from "@/components/map/listings-map";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildPageMetadata({
    locale,
    title: t("mapTitle"),
    description: t("mapDescription"),
    path: "map",
  });
}

export default async function MapPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const sp = await searchParams;
  const prefix = `/${locale}`;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        className="shrink-0 !py-3 md:!py-4"
        title={t("map.title")}
        description={t("map.heroSubtitle")}
        icon={MapIcon}
        actions={
          <Button className="gap-2" size="sm" asChild>
            <Link href={`${prefix}/listings/new`}>
              <FilePlus2 className="size-4" />
              {t("nav.createListing")}
            </Link>
          </Button>
        }
      >
        <MapFilters />
      </PageHeader>

      <div className="relative min-h-0 flex-1">
        <ListingsMap locale={locale} type={sp.type} petType={sp.petType} />
      </div>
    </div>
  );
}
