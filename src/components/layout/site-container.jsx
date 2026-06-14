import { cn } from "@/lib/utils";

/** Centered page shell — capped at the site content width with consistent horizontal padding. */
export function SiteContainer({ className, as: Component = "div", ...props }) {
  return <Component className={cn("site-container", className)} {...props} />;
}
