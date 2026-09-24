"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmAge } from "@/lib/actions/age";
import { MIN_BIRTH_YEAR } from "@/lib/auth/age";

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** One-step age confirmation: birth month + year. Navigation is handled by the server action. */
export function AgeConfirmForm() {
  const t = useTranslations("age");
  const currentYear = new Date().getUTCFullYear();

  const years = useMemo(() => {
    const list = [];
    for (let y = currentYear; y >= MIN_BIRTH_YEAR; y -= 1) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!month || !year) {
      toast.error(t("errors.required"));
      return;
    }

    setLoading(true);
    const result = await confirmAge({
      birthMonth: Number(month),
      birthYear: Number(year),
    });
    // Successful paths call redirect() and never return here.
    setLoading(false);
    if (result?.error) {
      const key = `errors.${result.error}`;
      toast.error(t.has(key) ? t(key) : t("errors.generic"));
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="birth-month">{t("monthLabel")}</Label>
              <Select value={month} onValueChange={setMonth} disabled={loading}>
                <SelectTrigger id="birth-month">
                  <SelectValue placeholder={t("monthPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_KEYS.map((key, index) => (
                    <SelectItem key={key} value={String(index + 1)}>
                      {t(`months.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth-year">{t("yearLabel")}</Label>
              <Select value={year} onValueChange={setYear} disabled={loading}>
                <SelectTrigger id="birth-year">
                  <SelectValue placeholder={t("yearPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !month || !year}>
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
