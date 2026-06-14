import { HomeSection } from "./home-section";
import { SiteContainer } from "@/components/layout/site-container";
import { cn } from "@/lib/utils";

/**
 * Compact page header for tool / browse pages (listings, create alert).
 * Title + actions on one row; optional toolbar slot for filters or controls.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  wide = true,
}) {
  const hasToolbar = Boolean(children);

  return (
    <HomeSection surface="toolbar" className={cn("py-5 md:py-6", className)}>
      <SiteContainer className={wide ? "max-w-5xl" : undefined}>
        {hasToolbar ? (
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-sm">
            {Icon && (
              <Icon
                aria-hidden
                className="pointer-events-none absolute -end-4 -top-4 size-28 text-primary/[0.07] md:size-32"
              />
            )}
            <TitleRow
              title={title}
              description={description}
              icon={Icon}
              actions={actions}
              className="relative px-4 py-4 md:px-6"
            />
            <div className="relative border-t border-border/40 px-4 py-4 md:px-6">{children}</div>
          </div>
        ) : (
          <TitleRow title={title} description={description} icon={Icon} actions={actions} />
        )}
      </SiteContainer>
    </HomeSection>
  );
}

function TitleRow({ title, description, icon: Icon, actions, className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3 md:gap-4">
        {Icon && (
          <div className="relative shrink-0">
            <div
              aria-hidden
              className="absolute inset-0 rounded-xl bg-primary/20 blur-md"
            />
            <div className="relative flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 md:size-12">
              <Icon className="size-5 md:size-6" />
            </div>
          </div>
        )}
        <div className="min-w-0 pt-0.5">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
