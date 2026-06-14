"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/validation";
import { TurnstileChallenge } from "@/components/security/turnstile-challenge";
import { TURNSTILE_ACTIONS } from "@/config/constants/turnstile";
import { revealListingContactAction } from "@/lib/actions/listings";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

/** Maps API error codes to translation keys under `listings.contactErrors`. */
const CONTACT_ERROR_KEYS = {
  captcha_required: "captchaRequired",
  captcha_failed: "captchaFailed",
  captcha_unavailable: "captchaUnavailable",
  not_found: "notFound",
  self_contact: "selfContact",
  contact_disabled: "unavailable",
};

/**
 * Gated contact reveal — user completes a Turnstile challenge, then contact
 * details are fetched via a server action.
 */
export function ContactButton({ listingId, embedded = false }) {
  const t = useTranslations();
  const turnstileRef = useRef(null);
  const pendingRunRef = useRef(false);

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const isBusy = loading || verifying;

  async function fetchContact(token) {
    setLoading(true);
    setError(null);

    try {
      const result = await revealListingContactAction(listingId, token);

      if (result.error) {
        const key = CONTACT_ERROR_KEYS[result.error] ?? "generic";
        setError(t(`listings.contactErrors.${key}`));
        turnstileRef.current?.reset();
        return;
      }

      setContact(result.contact);
      trackEvent(ANALYTICS_EVENTS.LISTING_CONTACT_REVEAL, { listing_id: listingId });
    } catch {
      setError(t("listings.contactErrors.generic"));
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }

  function runChallenge() {
    if (turnstileRef.current?.isReady()) {
      pendingRunRef.current = false;
      turnstileRef.current.run();
    }
  }

  function startReveal() {
    setError(null);
    setVerifying(true);
    pendingRunRef.current = true;
    runChallenge();
  }

  function handleWidgetLoad() {
    if (pendingRunRef.current) runChallenge();
  }

  function handleCaptchaSuccess(token) {
    fetchContact(token);
  }

  function handleCaptchaExpire() {
    setVerifying(false);
    setError(t("listings.contactErrors.captchaExpired"));
  }

  function handleCaptchaError() {
    setVerifying(false);
    setError(t("listings.contactErrors.captchaFailed"));
    turnstileRef.current?.reset();
  }

  if (contact) {
    return (
      <div
        className={
          embedded
            ? "space-y-3"
            : "space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4"
        }
      >
        <p className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          {t("listings.contactRevealed")}
        </p>
        <div className="space-y-2">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              {formatPhoneDisplay(contact.phone)}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-3" : "rounded-lg border bg-muted/30 p-4"}>
      <p className="font-medium">{t("listings.wantToContact")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("listings.contactRevealHint")}</p>

      <Button
        type="button"
        className="mt-4"
        onClick={startReveal}
        disabled={isBusy}
        aria-busy={isBusy}
      >
        {isBusy ? (
          <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
        ) : (
          <MessageCircle className="me-2 size-4" />
        )}
        {loading
          ? t("listings.contactLoading")
          : verifying
            ? t("listings.contactVerifying")
            : t("listings.contactReveal")}
      </Button>

      <TurnstileChallenge
        ref={turnstileRef}
        action={TURNSTILE_ACTIONS.LISTING_CONTACT}
        onSuccess={handleCaptchaSuccess}
        onError={handleCaptchaError}
        onExpire={handleCaptchaExpire}
        onLoad={handleWidgetLoad}
        className={verifying ? "mt-3" : "sr-only"}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
