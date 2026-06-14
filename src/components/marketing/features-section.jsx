import Link from "next/link";
import { ArrowRight, Bell, Map, Search, Sparkles, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HomeSection } from "./home-section";
import { SiteContainer } from "@/components/layout/site-container";

/** Icon and accent styling keyed by feature id from the page data. */
const FEATURE_STYLES = {
  search: {
    icon: Search,
    iconBg: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
  },
  matching: {
    icon: Sparkles,
    iconBg: "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white dark:text-amber-400",
  },
  map: {
    icon: Map,
    iconBg: "bg-sky-500/10 text-sky-600 group-hover:bg-sky-500 group-hover:text-white dark:text-sky-400",
  },
  alerts: {
    icon: Bell,
    iconBg: "bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white dark:text-violet-400",
  },
};

function AboutCallout({ locale, title, description, linkLabel, href }) {
  const prefix = `/${locale}`;
  const aboutHref = href.startsWith("/") ? `${prefix}${href}` : href;

  return (
    <div className="relative mt-10 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.05] via-card to-muted/50 p-6 shadow-sm md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -end-12 -top-12 size-40 rounded-full bg-primary/[0.08] blur-3xl"
      />

      <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-7" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
            {description}
          </p>
        </div>

        <Button className="shrink-0 gap-2" asChild>
          <Link href={aboutHref}>
            {linkLabel}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function FeaturesSection({ locale, title, subtitle, features, about }) {
  return (
    <HomeSection surface="default" className="py-16 md:py-20">
      <SiteContainer>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const style = FEATURE_STYLES[feature.id] ?? FEATURE_STYLES.search;
            const Icon = style.icon;

            return (
              <Card
                key={feature.id}
                className="group relative overflow-hidden border-border/60 bg-card shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 opacity-80" />
                <CardContent className="flex h-full flex-col gap-4 pt-8">
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl transition-colors ${style.iconBg}`}
                  >
                    <Icon className="size-6" aria-hidden />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {about && (
          <AboutCallout
            locale={locale}
            title={about.title}
            description={about.description}
            linkLabel={about.linkLabel}
            href={about.href}
          />
        )}
      </SiteContainer>
    </HomeSection>
  );
}
