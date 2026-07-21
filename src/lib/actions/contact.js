/** @file Public contact form server action. */
"use server";

import { getTranslations } from "next-intl/server";
import { env } from "@/config/env";
import { sendEmail } from "@/lib/email";
import { buildContactFormEmail } from "@/lib/email/templates";
import { contactFormSchema } from "@/lib/validation";
import { TURNSTILE_ACTIONS } from "@/config/constants/turnstile";
import { runTurnstileAction } from "@/lib/turnstile";

/** Validate, verify Turnstile, and email the public contact form. */
export async function submitContactForm({ name, topic, message, token }) {
  return runTurnstileAction(
    contactFormSchema,
    { name, topic, message, token },
    TURNSTILE_ACTIONS.CONTACT_FORM,
    async ({ name: safeName, topic: safeTopic, message: safeMessage }) => {
      try {
        const t = await getTranslations("pages.contact.emailTemplate");
        const email = buildContactFormEmail({
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
  );
}
