"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Menu, Shield, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import {
  MAIN_NAV_LINKS,
  CREATE_LISTING_LINK,
  ACCOUNT_NAV_LINKS,
} from "./nav-config";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProfileBlock({ user }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
      <Avatar className="size-10">
        <AvatarImage src={user.image || undefined} alt={user.name || ""} />
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

export function MobileNavSheet({ session }) {
  const t = useTranslations();
  const locale = useLocale();
  const prefix = `/${locale}`;
  const [open, setOpen] = useState(false);

  const isStaff =
    session?.user.role === "admin" || session?.user.role === "moderator";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("nav.openMenu")}
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      {open ? (
        <SheetContent
          side="right"
          className="flex w-[min(100vw-2rem,20rem)] flex-col gap-0 p-0"
        >
          <SheetHeader className="border-b px-6 py-4 text-start">
            <SheetTitle>{t("nav.menuTitle")}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
            {session && (
              <>
                <ProfileBlock user={session.user} />
                <Separator className="my-4" />
              </>
            )}

            <nav className="space-y-1">
              {MAIN_NAV_LINKS.map(({ href, labelKey }) => (
                <Button
                  key={href}
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                  onClick={() => setOpen(false)}
                >
                  <Link href={`${prefix}${href}`}>{t(labelKey)}</Link>
                </Button>
              ))}
            </nav>

            <Button className="mt-3 w-full" asChild onClick={() => setOpen(false)}>
              <Link href={`${prefix}${CREATE_LISTING_LINK.href}`}>
                {t(CREATE_LISTING_LINK.labelKey)}
              </Link>
            </Button>

            {session && (
              <>
                <Separator className="my-4" />
                <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("nav.accountSection")}
                </p>
                <nav className="space-y-1">
                  {ACCOUNT_NAV_LINKS.map(({ href, labelKey, icon: Icon }) => (
                    <Button
                      key={href}
                      variant="ghost"
                      className="w-full justify-start gap-2"
                      asChild
                      onClick={() => setOpen(false)}
                    >
                      <Link href={`${prefix}${href}`}>
                        <Icon className="size-4" />
                        {t(labelKey)}
                      </Link>
                    </Button>
                  ))}
                  {isStaff && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2"
                      asChild
                      onClick={() => setOpen(false)}
                    >
                      <Link href="/admin">
                        <Shield className="size-4" />
                        {t("nav.admin")}
                      </Link>
                    </Button>
                  )}
                </nav>
              </>
            )}
          </div>

          <div className="mt-auto space-y-3 border-t px-4 py-4">
            <LocaleSwitcher variant="inline" onSwitch={() => setOpen(false)} />
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
            {session ? (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => {
                  setOpen(false);
                  authClient.signOut();
                }}
              >
                <LogOut className="size-4" />
                {t("nav.signOut")}
              </Button>
            ) : (
              <Button className="w-full" asChild onClick={() => setOpen(false)}>
                <Link href={`${prefix}/sign-in`}>{t("nav.signIn")}</Link>
              </Button>
            )}
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
