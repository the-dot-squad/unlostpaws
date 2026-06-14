import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroLottie } from "./hero-lottie";
import { HomeSection } from "./home-section";
import { SiteContainer } from "@/components/layout/site-container";

export function HeroSection({ locale, title, subtitle, ctaReport, ctaBrowse }) {
  const prefix = `/${locale}`;

  return (
    <HomeSection surface="hero" decor="hero">
      <SiteContainer className="relative grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="text-center md:text-start">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-4 text-lg text-muted-foreground md:max-w-lg">{subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Button size="lg" asChild>
              <Link href={`${prefix}/listings/new`}>
                <FilePlus2 className="size-4" />
                {ctaReport}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={`${prefix}/listings`}>
                <Search className="size-4" />
                {ctaBrowse}
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <HeroLottie />
        </div>
      </SiteContainer>
    </HomeSection>
  );
}
