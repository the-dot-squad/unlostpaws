import { HandHeart, HeartHandshake, ScanSearch, SearchX, Users } from "lucide-react";
import { HomeSection } from "./home-section";
import { SiteContainer } from "@/components/layout/site-container";
import { cn } from "@/lib/utils";

/** Visual config per stat kind — icon, accent colors, and layout hints. */
const STAT_STYLES = {
  missing: {
    icon: SearchX,
    accent: "bg-amber-500",
    iconBg: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    value: "text-amber-600 dark:text-amber-400",
    hover: "hover:bg-amber-500/[0.06]",
  },
  found: {
    icon: ScanSearch,
    accent: "bg-sky-500",
    iconBg: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    value: "text-sky-600 dark:text-sky-400",
    hover: "hover:bg-sky-500/[0.06]",
  },
  surrender: {
    icon: HandHeart,
    accent: "bg-violet-500",
    iconBg: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    value: "text-violet-600 dark:text-violet-400",
    hover: "hover:bg-violet-500/[0.06]",
  },
  reunited: {
    icon: HeartHandshake,
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-600 dark:text-emerald-400",
    hover: "hover:bg-emerald-500/[0.06]",
  },
  users: {
    icon: Users,
    accent: "bg-rose-500",
    iconBg: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    value: "text-rose-600 dark:text-rose-400",
    hover: "hover:bg-rose-500/[0.06]",
  },
};

export function StatsStrip({ title, subtitle, stats }) {
  return (
    <HomeSection surface="muted" decor="muted" className="py-12 md:py-14">
      <SiteContainer className="relative">
        {(title || subtitle) && (
          <div className="mb-8 text-center">
            {title && <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>}
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-border/45 shadow-sm ring-1 ring-border/25">
          <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((stat) => {
              const style = STAT_STYLES[stat.kind] ?? STAT_STYLES.missing;
              const Icon = style.icon;

              return (
                <div
                  key={stat.kind}
                  className={cn(
                    "group relative flex min-h-[9.5rem] flex-col items-center justify-center gap-2.5 bg-card/95 px-3 py-6 text-center backdrop-blur-sm transition-colors sm:min-h-[10.5rem] sm:px-4",
                    style.hover
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-5 top-0 h-0.5 rounded-full opacity-70 transition-opacity group-hover:opacity-100 sm:inset-x-7",
                      style.accent
                    )}
                  />

                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
                      style.iconBg
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </div>

                  <p
                    className={cn(
                      "text-3xl font-bold tabular-nums leading-none tracking-tight sm:text-[2rem]",
                      style.value
                    )}
                  >
                    {stat.value.toLocaleString()}
                  </p>

                  <p className="flex min-h-[2.5rem] max-w-[8.5rem] items-center justify-center text-balance text-xs font-medium leading-snug text-muted-foreground sm:max-w-[9.5rem] sm:text-sm">
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </SiteContainer>
    </HomeSection>
  );
}
