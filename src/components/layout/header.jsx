"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useSession, authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  User,
  LayoutDashboard,
  FileText,
  Heart,
  GitCompare,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { SiteContainer } from "./site-container";
import { AppLogo } from "./app-logo";

const ACCOUNT_MENU_LINKS = [
  { href: "/account", labelKey: "nav.account", icon: LayoutDashboard },
  { href: "/account/listings", labelKey: "nav.myListings", icon: FileText },
  { href: "/account/pets", labelKey: "nav.myPets", icon: Heart },
  { href: "/account/matches", labelKey: "nav.matches", icon: GitCompare },
  { href: "/account/settings", labelKey: "account.nav.profile", icon: Settings },
];

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: session } = useSession();
  const prefix = `/${locale}`;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SiteContainer className="flex h-14 items-center justify-between gap-4">
        <Link href={prefix} className="flex items-center gap-2 font-semibold">
          <AppLogo size="nav" />
          <span>{t("common.appName")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" asChild>
            <Link href={`${prefix}/listings`}>{t("nav.listings")}</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`${prefix}/map`}>{t("nav.map")}</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`${prefix}/listings/new`}>{t("nav.createListing")}</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`${prefix}/about`}>{t("nav.about")}</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {ACCOUNT_MENU_LINKS.map(({ href, labelKey, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={`${prefix}${href}`}>
                      <Icon />
                      {t(labelKey)}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {(session.user.role === "admin" || session.user.role === "moderator") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield />
                        {t("nav.admin")}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => authClient.signOut()}>
                  <LogOut />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href={`${prefix}/sign-in`}>{t("nav.signIn")}</Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`${prefix}/listings`}>{t("nav.listings")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${prefix}/map`}>{t("nav.map")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${prefix}/about`}>{t("nav.about")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${prefix}/listings/new`}>{t("nav.createListing")}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SiteContainer>
    </header>
  );
}
