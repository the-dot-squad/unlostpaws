"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { REPORT_REASONS } from "@/config/constants/enums";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TurnstileChallenge } from "@/components/security/turnstile-challenge";
import { TURNSTILE_ACTIONS } from "@/config/constants/turnstile";
import { submitListingReportAction } from "@/lib/actions/listings";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";
import { Flag, LogIn } from "lucide-react";

const REPORT_ERROR_KEYS = {
  auth_required: "authRequired",
  unauthorized: "authRequired",
  banned: "authRequired",
  captcha_required: "captchaRequired",
  captcha_failed: "captchaFailed",
  captcha_unavailable: "captchaUnavailable",
  not_found: "notFound",
  self_report: "selfReport",
  already_reported: "alreadyReported",
  report_limit_exceeded: "reportLimitExceeded",
  details_too_long: "detailsTooLong",
  invalid_body: "generic",
};

export function ReportDialog({ listingId, isSignedIn, signInHref }) {
  const t = useTranslations("listings");
  const tCommon = useTranslations("common");
  const tReasons = useTranslations("reportReasons");
  const turnstileRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setReason("spam");
    setDetails("");
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  }

  async function handleSubmit() {
    const token = captchaToken || turnstileRef.current?.getToken();
    if (!token) {
      toast.error(t("reportErrors.captchaRequired"));
      return;
    }

    setLoading(true);

    try {
      const result = await submitListingReportAction({
        listingPublicId: listingId,
        token,
        reason,
        details,
      });
      setLoading(false);

      if (result.error) {
        const key = REPORT_ERROR_KEYS[result.error] ?? "generic";
        toast.error(t(`reportErrors.${key}`));
        turnstileRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      toast.success(t("reported"));
      trackEvent(ANALYTICS_EVENTS.LISTING_REPORT_SUBMIT, {
        listing_id: listingId,
        reason,
      });
      setOpen(false);
      resetForm();
    } catch {
      setLoading(false);
      toast.error(t("reportErrors.generic"));
      turnstileRef.current?.reset();
      setCaptchaToken(null);
    }
  }

  function handleOpenChange(next) {
    setOpen(next);
    if (!next) resetForm();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Flag className="size-4" />
          {t("report")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("report")}</DialogTitle>
          <DialogDescription>
            {isSignedIn ? t("reportHint") : t("reportSignInHint")}
          </DialogDescription>
        </DialogHeader>

        {!isSignedIn ? (
          <Button asChild className="w-full">
            <Link href={signInHref}>
              <LogIn className="me-2 size-4" />
              {t("signInToReport")}
            </Link>
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">{t("reportReason")}</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="report-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {tReasons(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-details">{t("reportDetails")}</Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t("reportDetailsPlaceholder")}
                maxLength={2000}
                rows={4}
              />
            </div>

            {open ? (
              <TurnstileChallenge
                ref={turnstileRef}
                variant="invisible"
                action={TURNSTILE_ACTIONS.LISTING_REPORT}
                onSuccess={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />
            ) : null}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full"
            >
              {loading ? tCommon("loading") : tCommon("submit")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
