"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppLogo } from "@/components/layout/app-logo";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FileText,
  Flag,
  Users,
  Settings,
  GitCompare,
  Heart,
  BarChart3,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/stats", label: "Stats", icon: BarChart3 },
  { href: "/admin/listings", label: "Listings", icon: FileText },
  { href: "/admin/pets", label: "Registered Pets", icon: Heart },
  { href: "/admin/reports", label: "Reports", icon: Flag, badgeKey: "openReports" },
  { href: "/admin/matches", label: "AI Matches", icon: GitCompare },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

function isActive(pathname, href, exact) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ userName, userRole, badges = {} }) {
  const pathname = usePathname();
  const visibleNav = NAV.filter((item) => !item.adminOnly || userRole === "admin");

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-e bg-muted/20">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link
          href={`/${routing.defaultLocale}`}
          className="shrink-0 rounded-md transition-opacity hover:opacity-80"
          aria-label="Back to website"
        >
          <AppLogo size="sm" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">UnLostPaws</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {visibleNav.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const badge = item.badgeKey ? badges[item.badgeKey] : null;

          return (
            <Button
              key={item.href}
              variant={active ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-2", active && "font-medium")}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1 text-start">{item.label}</span>
                {badge > 0 ? (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">
                    {badge}
                  </Badge>
                ) : null}
              </Link>
            </Button>
          );
        })}
      </nav>

      <Separator />
      <div className="space-y-2 p-4">
        <div>
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="text-xs capitalize text-muted-foreground">{userRole}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => signOut()}
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
