"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function LocaleError({ error, reset }) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("[locale-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t("description")}</p>
      <Button type="button" onClick={() => reset()}>
        {t("retry")}
      </Button>
    </div>
  );
}
