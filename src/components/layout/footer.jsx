import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Bell,
  MapPin,
  PlusCircle,
  Info,
  MessageSquare,
  Shield,
  ScrollText,
  CircleHelp,
  Heart,
  Star,
} from "lucide-react";
import { CookiePreferencesLink } from "@/components/consent/cookie-preferences-link";
import { SiteContainer } from "./site-container";
import { AppLogo } from "./app-logo";
import { GithubIcon } from "./github-star-button";
import { publicEnv } from "@/config/public";
import { getCachedGithubStars } from "@/lib/github";

const EXPLORE_LINKS = [
  { key: "listings", href: "/listings", icon: Bell },
  { key: "map", href: "/map", icon: MapPin },
  { key: "about", href: "/about", icon: Info },
  { key: "createListing", href: "/listings/new", icon: PlusCircle },
];

const SUPPORT_LINKS = [
  { key: "faq", href: "/faq", icon: CircleHelp },
  { key: "contact", href: "/contact", icon: MessageSquare },
  { key: "terms", href: "/terms", icon: ScrollText },
  { key: "privacy", href: "/terms/privacy", icon: Shield },
];

function FooterLink({ href, icon: Icon, children, ...props }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      {...props}
    >
      <Icon className="size-4 shrink-0 text-primary/70 transition-colors group-hover:text-primary" />
      <span>{children}</span>
    </Link>
  );
}

export async function Footer({ locale = "en" }) {
  const t = await getTranslations();
  const prefix = `/${locale}`;
  const year = new Date().getFullYear();
  const stars = await getCachedGithubStars();

  return (
    <footer className="relative mt-auto overflow-hidden border-t bg-gradient-to-b from-muted/50 via-muted/30 to-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-24 bottom-0 size-48 rounded-full bg-primary/5 blur-3xl"
        aria-hidden
      />

      <SiteContainer className="relative py-12 md:py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-[1.8fr_1fr_1fr_1fr] lg:gap-8">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1 md:pe-4">
            <Link href={prefix} className="inline-flex w-fit items-center gap-2.5 font-semibold">
              <AppLogo size="md" className="rounded-xl" />
              <span className="text-lg">{t("common.appName")}</span>
            </Link>

            <p className="text-sm leading-relaxed text-muted-foreground">{t("footer.description")}</p>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
              {t("footer.copyright", { year, appName: t("common.appName") })}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide">{t("footer.explore")}</h3>
            <ul className="space-y-3">
              {EXPLORE_LINKS.map(({ key, href, icon }) => (
                <li key={key}>
                  <FooterLink href={`${prefix}${href}`} icon={icon}>
                    {t(`nav.${key}`)}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide">{t("footer.support")}</h3>
            <ul className="space-y-3">
              {SUPPORT_LINKS.map(({ key, href, icon }) => (
                <li key={key}>
                  <FooterLink href={`${prefix}${href}`} icon={icon}>
                    {t(`footer.${key}`)}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h3 className="mb-4 text-sm font-semibold tracking-wide">{t("footer.project")}</h3>
            <ul className="space-y-3">
              <li>
                <FooterLink
                  href={publicEnv.githubRepo}
                  icon={GithubIcon}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span>{t("footer.gitHub")}</span>
                    {typeof stars === "number" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        <span>{stars}</span>
                      </span>
                    )}
                  </span>
                </FooterLink>
              </li>
              <li>
                <FooterLink href={`https://buymeacoffee.com/davod`} icon={Heart}>
                  {t("footer.donate")}
                </FooterLink>
              </li>
              <li>
                <CookiePreferencesLink label={t("footer.cookieSettings")} />
              </li>
            </ul>
          </div>
        </div>
      </SiteContainer>
    </footer>
  );
}
