import { Card, CardContent } from "@/components/ui/card";
import { HomeSection } from "./home-section";
import { PageHero } from "./page-hero";
import { SiteContainer } from "@/components/layout/site-container";
import { cn } from "@/lib/utils";

const PROSE =
  "space-y-6 text-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-medium [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:ps-6 [&_ul]:text-muted-foreground [&_li]:leading-relaxed";

/**
 * Shared layout for static content pages — hero band + card body.
 */
export function ContentPage({ title, subtitle, icon, children, wide = false }) {
  return (
    <>
      <PageHero title={title} subtitle={subtitle} icon={icon} />

      <HomeSection surface="default" className="py-12 md:py-16">
        <SiteContainer className={cn(wide ? "max-w-5xl" : "max-w-3xl")}>
          <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="p-8 md:p-10">
              <div className={PROSE}>{children}</div>
            </CardContent>
          </Card>
        </SiteContainer>
      </HomeSection>
    </>
  );
}

/** Standalone body section when the page manages its own hero or layout. */
export function ContentBody({ children, wide = false, className, containerClassName }) {
  return (
    <HomeSection surface="default" className={cn("py-12 md:py-16", className)}>
      <SiteContainer className={cn(wide ? "max-w-5xl" : "max-w-3xl", containerClassName)}>
        {children}
      </SiteContainer>
    </HomeSection>
  );
}
