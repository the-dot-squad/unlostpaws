"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";

export default function GlobalError({ error, reset }) {
  const [isDark, setIsDark] = useState(false);
  const [isFa, setIsFa] = useState(false);

  useEffect(() => {
    // 1. Log the error to console
    console.error("[global-error]", error);

    // 2. Detect locale from pathname or lang attribute
    const pathname = window.location.pathname;
    const pathIsFa = pathname.startsWith("/fa");
    const docIsFa = document.documentElement.lang === "fa";

    // 3. Detect and apply theme (dark/light)
    const storedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const darkActive = storedTheme === "dark" || (!storedTheme && systemPrefersDark);
    
    if (darkActive) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Update state asynchronously to avoid synchronous setState inside useEffect warning
    setTimeout(() => {
      setIsFa(pathIsFa || docIsFa);
      setIsDark(darkActive);
    }, 0);
  }, [error]);

  const texts = {
    en: {
      title: "Something went wrong",
      description: "An unexpected critical error occurred. We've logged the issue and are looking into it.",
      retry: "Try again",
      home: "Go to Home",
    },
    fa: {
      title: "خطای غیرمنتظره رخ داد",
      description: "یک خطای بحرانی غیرمنتظره رخ داده است. این مشکل ثبت شد و در حال بررسی آن هستیم.",
      retry: "تلاش مجدد",
      home: "بازگشت به خانه",
    },
  };

  const t = isFa ? texts.fa : texts.en;
  const dir = isFa ? "rtl" : "ltr";

  return (
    <html lang={isFa ? "fa" : "en"} dir={dir} className={isDark ? "dark h-full" : "h-full"}>
      <body className="flex min-h-full items-center justify-center bg-background px-6 py-12 font-sans text-foreground antialiased selection:bg-primary/20">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-xl transition-all duration-300">
          {/* Subtle background glow effect */}
          <div className="absolute -top-12 -left-12 -z-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl"></div>
          <div className="absolute -bottom-12 -right-12 -z-10 h-24 w-24 rounded-full bg-destructive/5 blur-2xl"></div>

          <div className="flex flex-col items-center gap-6">
            {/* Header / Logo */}
            <div className="flex items-center gap-2">
              <AppLogo size="md" className="rounded-xl shadow-sm animate-pulse" />
              <span className="text-xl font-bold tracking-tight">UnLostPaws</span>
            </div>

            {/* Error Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive dark:bg-destructive/20">
              <AlertCircle className="h-8 w-8" />
            </div>

            {/* Error Messages */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {t.description}
              </p>
            </div>

            {/* Technical Detail */}
            {error?.message && (
              <div className="w-full rounded-lg bg-muted/50 p-3 text-left font-mono text-xs text-muted-foreground max-h-24 overflow-auto border border-border/40">
                <span className="font-semibold text-destructive/80">Error:</span> {error.message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-2">
              <button
                type="button"
                onClick={() => reset()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-95 hover:shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                {t.retry}
              </button>
              <a
                href={isFa ? "/fa" : "/en"}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all active:scale-98 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                {t.home}
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
