"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

const locales = [
  { code: "en", label: "English" },
  { code: "fa", label: "فارسی" },
];

export function LocaleSwitcher({ variant = "icon", onSwitch }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(nextLocale) {
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    router.push(segments.join("/") || "/");
    onSwitch?.();
  }

  if (variant === "inline") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {locales.map((l) => (
          <Button
            key={l.code}
            variant={locale === l.code ? "secondary" : "outline"}
            size="sm"
            className="w-full"
            onClick={() => switchLocale(l.code)}
          >
            {l.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Switch language">
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchLocale(l.code)}
            className={cn(locale === l.code && "bg-accent")}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
