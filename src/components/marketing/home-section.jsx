import { cn } from "@/lib/utils";

/**
 * Shared home-page section surfaces — keeps background rhythm consistent.
 *
 * Rhythm: hero (gradient) → muted band → default → muted band
 */
const SURFACES = {
  hero: "border-b border-border/50 bg-gradient-to-b from-primary/[0.07] via-background to-background",
  muted: "border-y border-border/40 bg-muted/35",
  toolbar: "border-b border-border/40 bg-muted/35",
  default: "bg-background",
};

/**
 * @param {"hero" | "muted" | "toolbar" | "default"} surface
 * @param {"hero" | "muted" | false} [decor] — soft primary glow orbs
 */
export function HomeSection({ surface = "default", decor = false, className, children }) {
  return (
    <section className={cn("relative overflow-hidden", SURFACES[surface], className)}>
      {decor === "hero" && <HeroDecor />}
      {decor === "muted" && <MutedDecor />}
      {children}
    </section>
  );
}

function BackgroundBlob({ className }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute rounded-full blur-3xl", className)} />
  );
}

function HeroDecor() {
  return (
    <>
      <BackgroundBlob className="-end-32 -top-32 size-96 bg-primary/10" />
      <BackgroundBlob className="-bottom-32 -start-32 size-80 bg-primary/[0.06]" />
    </>
  );
}

function MutedDecor() {
  return (
    <>
      <BackgroundBlob className="-start-20 top-0 size-72 bg-primary/[0.05]" />
      <BackgroundBlob className="-end-20 bottom-0 size-72 bg-primary/[0.05]" />
    </>
  );
}
