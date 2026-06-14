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

function HeroDecor() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -end-32 -top-32 size-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -start-32 size-80 rounded-full bg-primary/[0.06] blur-3xl"
      />
    </>
  );
}

function MutedDecor() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -start-20 top-0 size-72 rounded-full bg-primary/[0.05] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -end-20 bottom-0 size-72 rounded-full bg-primary/[0.05] blur-3xl"
      />
    </>
  );
}
