"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  FileText,
  Heart,
  GitCompare,
  Settings,
  Menu,
} from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { cn } from "@/lib/utils";
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

/** Navigation items for the account area. */
function useAccountNav(locale) {
  const t = useTranslations();
  const prefix = `/${locale}/account`;

  return [
    { href: prefix, label: t("account.nav.dashboard"), icon: LayoutDashboard, exact: true },
    { href: `${prefix}/listings`, label: t("nav.myListings"), icon: FileText },
    { href: `${prefix}/pets`, label: t("nav.myPets"), icon: Heart },
    { href: `${prefix}/matches`, label: t("nav.matches"), icon: GitCompare },
    { href: `${prefix}/settings`, label: t("account.nav.profile"), icon: Settings },
  ];
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function NavLinks({ items, pathname, onNavigate }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Button
            key={item.href}
            variant={isActive ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-2", isActive && "font-medium")}
            asChild
            onClick={onNavigate}
          >
            <Link href={item.href}>
              <item.icon className="size-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

function SidebarUser({ user }) {
  return (
    <div className="flex items-center gap-3 px-2 py-3">
      <Avatar className="size-9">
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

/**
 * Desktop sidebar + mobile sheet navigation for the account section.
 */
export function AccountSidebar({ locale, user }) {
  const t = useTranslations();
  const pathname = usePathname();
  const items = useAccountNav(locale);

  return (
    <>
      {/* Mobile menu trigger */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2 font-semibold">
          <AppLogo size="sm" />
          {t("account.title")}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t("account.nav.openMenu")}>
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>{t("account.title")}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <SidebarUser user={user} />
              <Separator className="my-3" />
              <NavLinks items={items} pathname={pathname} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-20 space-y-4">
          <div className="rounded-xl border bg-card p-2 shadow-sm">
            <SidebarUser user={user} />
            <Separator className="my-2" />
            <NavLinks items={items} pathname={pathname} />
          </div>
        </div>
      </aside>
    </>
  );
}
