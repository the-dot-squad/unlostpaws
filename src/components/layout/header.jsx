"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useSession, authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNavSheet } from "./mobile-nav-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Shield, LogOut } from "lucide-react";
import { SiteContainer } from "./site-container";
import { AppLogo } from "./app-logo";
import {
  MAIN_NAV_LINKS,
  CREATE_LISTING_LINK,
  ACCOUNT_NAV_LINKS,
} from "./nav-config";

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: session } = useSession();
  const prefix = `/${locale}`;

  const desktopNavLinks = [...MAIN_NAV_LINKS, CREATE_LISTING_LINK];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SiteContainer className="flex h-14 items-center justify-between gap-4">
        <Link href={prefix} className="flex items-center gap-2 font-semibold">
          <AppLogo size="nav" />
          <span>{t("common.appName")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {desktopNavLinks.map(({ href, labelKey }) => (
            <Button key={href} variant="ghost" asChild>
              <Link href={`${prefix}${href}`}>{t(labelKey)}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
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
                  {ACCOUNT_NAV_LINKS.map(({ href, labelKey, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={`${prefix}${href}`}>
                        <Icon />
                        {t(labelKey)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  {(session.user.role === "admin" ||
                    session.user.role === "moderator") && (
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
          </div>

          <MobileNavSheet session={session} />
        </div>
      </SiteContainer>
    </header>
  );
}
