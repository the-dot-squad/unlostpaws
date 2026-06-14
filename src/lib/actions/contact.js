/** @file Public contact form server action. */
"use server";

import { getTranslations } from "next-intl/server";
import { env } from "@/config/env";
import { sendEmail } from "@/lib/email";
import { contactFormEmail } from "@/lib/email/templates";
import { contactFormSchema, validate } from "@/lib/validation";
import { TURNSTILE_ACTIONS } from "@/config/constants/turnstile";
import { verifyListingTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-metadata";
import { checkIpRateLimits } from "@/lib/rate-limit/ip";

/** Validate, verify Turnstile, and email the public contact form. */
export async function submitContactForm({ name, topic, message, token }) {
  const parsed = validate(contactFormSchema, { name, topic, message, token });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const captcha = await verifyListingTurnstile(token, TURNSTILE_ACTIONS.CONTACT_FORM);
  if (!captcha.ok) {
    return { error: captcha.error };
  }

  try {
    const ipCheck = await checkIpRateLimits(await getClientIp());
    if (!ipCheck.allowed) {
      return { error: "rate_limit_exceeded" };
    }
  } catch {
    // Rate limit store unavailable — allow submission.
  }

  const { name: safeName, topic: safeTopic, message: safeMessage } = parsed.data;

  try {
    const t = await getTranslations("pages.contact.emailTemplate");
    const email = contactFormEmail({
      name: safeName,
      topic: safeTopic,
      message: safeMessage,
      subject: t("subject", { topic: safeTopic }),
      heading: t("heading"),
      nameLabel: t("nameLabel"),
      topicLabel: t("topicLabel"),
      messageLabel: t("messageLabel"),
    });

    await sendEmail({
      to: env.contact.inboxEmail,
      ...email,
    });

    return { success: true };
  } catch (err) {
    console.error("Contact form email failed:", err.message);
    return { error: "send_failed" };
  }
}
