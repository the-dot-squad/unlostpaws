import { HomeSection } from "./home-section";
import { SiteContainer } from "@/components/layout/site-container";
import { cn } from "@/lib/utils";

/**
 * Compact hero for content and listings pages (about, terms, browse, create, etc.).
 */
export function PageHero({ title, subtitle, icon: Icon, actions, className }) {
  return (
    <HomeSection surface="hero" decor="hero" className={className}>
      <SiteContainer className="relative py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          {Icon && (
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-7" aria-hidden />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">{title}</h1>
          {subtitle && (
            <p className={cn("mt-4 text-lg text-muted-foreground md:text-xl")}>{subtitle}</p>
          )}
          {actions && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>
          )}
        </div>
      </SiteContainer>
    </HomeSection>
  );
}
