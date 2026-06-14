"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Footprints, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("notFound");
  const locale = useLocale();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center antialiased selection:bg-primary/20">
      {/* Dynamic backdrop glows */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/3 -z-10 h-60 w-60 rounded-full bg-destructive/5 blur-3xl"></div>

      <div className="flex w-full max-w-md flex-col items-center gap-8">
        {/* Animated illustration container */}
        <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl border border-border bg-card shadow-lg transition-transform hover:scale-105 duration-300">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary/5 to-transparent"></div>
          {/* Paw/Footprints */}
          <Footprints className="h-16 w-16 text-primary animate-pulse" />
          {/* Small search glass overlay */}
          <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Search className="h-5 w-5" />
          </div>
        </div>

        {/* 404 Number Badge */}
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase dark:bg-primary/20">
          404 Error
        </span>

        {/* Main Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("description")}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-2 justify-center">
          <Button
            asChild
            className="flex-1 h-11 transition-all active:scale-98"
          >
            <Link href={`/${locale}`}>
              {t("backHome")}
            </Link>
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 transition-all active:scale-98 gap-2"
            onClick={() => {
              if (typeof window !== "undefined") window.history.back();
            }}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("backNav")}
          </Button>
        </div>
      </div>
    </div>
  );
}
