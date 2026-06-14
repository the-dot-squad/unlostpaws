"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactForm } from "@/lib/actions/contact";
import { TurnstileChallenge } from "@/components/security/turnstile-challenge";
import { TURNSTILE_ACTIONS } from "@/config/constants/turnstile";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

export function ContactForm() {
  const t = useTranslations("pages.contact.form");
  const turnstileRef = useRef(null);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const token = captchaToken || turnstileRef.current?.getToken();
    if (!token) {
      toast.error(t("errors.captchaRequired"));
      return;
    }

    setLoading(true);

    const result = await submitContactForm({ name, topic, message, token });
    setLoading(false);

    if (result.error) {
      toast.error(t(`errors.${result.error}`, { defaultMessage: t("errors.send_failed") }));
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    toast.success(t("success"));
    trackEvent(ANALYTICS_EVENTS.CONTACT_FORM_SUBMIT, { topic });
    setName("");
    setTopic("");
    setMessage("");
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="contact-name">{t("name")}</Label>
        <Input
          id="contact-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          required
          maxLength={100}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-topic">{t("topic")}</Label>
        <Input
          id="contact-topic"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t("topicPlaceholder")}
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">{t("message")}</Label>
        <Textarea
          id="contact-message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("messagePlaceholder")}
          required
          rows={6}
          maxLength={5000}
          className="min-h-32 resize-y"
        />
      </div>

      <TurnstileChallenge
        ref={turnstileRef}
        variant="invisible"
        action={TURNSTILE_ACTIONS.CONTACT_FORM}
        onSuccess={setCaptchaToken}
        onExpire={() => setCaptchaToken(null)}
        onError={() => setCaptchaToken(null)}
      />

      <Button type="submit" size="lg" className="w-full gap-2 sm:w-auto" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {loading ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
