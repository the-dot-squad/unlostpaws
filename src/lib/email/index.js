import { env, isProd } from "@/config/env";
import { mailtrapAdapter } from "./adapters/mailtrap.js";
import { mailjetAdapter } from "./adapters/mailjet.js";
import { zeptomailAdapter } from "./adapters/zeptomail.js";

const adapters = {
  mailtrap: mailtrapAdapter,
  mailjet: mailjetAdapter,
  zeptomail: zeptomailAdapter,
};

function isProviderConfigured(provider) {
  if (provider === "mailtrap") {
    return Boolean(env.email.mailtrap.token && env.email.mailtrap.sandboxId);
  }
  if (provider === "mailjet") {
    return Boolean(env.email.mailjet.apiKey && env.email.mailjet.apiSecret);
  }
  if (provider === "zeptomail") {
    return Boolean(env.email.zeptomail.token);
  }
  return false;
}

function getAdapter() {
  const provider = env.email.provider;
  const adapter = adapters[provider];

  if (!adapter) {
    throw new Error(`Unknown email provider: ${provider}`);
  }

  if (isProd && !isProviderConfigured(provider)) {
    throw new Error(`EMAIL_PROVIDER "${provider}" is not configured for production`);
  }

  if (!isProviderConfigured(provider)) {
    console.warn(`Email provider "${provider}" not fully configured — using console fallback`);
    return {
      send: async ({ to, subject, html }) => {
        console.log("[email]", { to, subject, html: html?.slice(0, 200) });
        return { success: true, skipped: true };
      },
    };
  }

  return adapter;
}

/**
 * Send a transactional email via the configured provider (EMAIL_PROVIDER).
 *
 * @param {object} params
 * @param {string} params.to - Recipient address
 * @param {string} [params.toName] - Recipient display name
 * @param {string} params.subject
 * @param {string} [params.html]
 * @param {string} [params.text]
 */
export async function sendEmail({ to, toName, subject, html, text }) {
  const adapter = getAdapter();
  return adapter.send({ to, toName, subject, html, text });
}
