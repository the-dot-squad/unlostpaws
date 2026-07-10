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
  const provider = env.email.provider;
  console.log(`[email] [INFO] Attempting to send email to "${to}" via provider "${provider}"...`);

  try {
    const adapter = getAdapter();
    const result = await adapter.send({ to, toName, subject, html, text });

    if (result.skipped) {
      console.log(`[email] [WARN] Email skipped for "${to}". Reason: Provider "${provider}" is not fully configured or sandbox credentials missing.`);
    } else {
      console.log(`[email] [SUCCESS] Email sent to "${to}" successfully. Subject: "${subject}". Message IDs: ${JSON.stringify(result.messageIds || "N/A")}`);
    }

    return result;
  } catch (error) {
    console.error(`[email] [ERROR] Failed to send email to "${to}" using provider "${provider}". Error:`, error.message || error);
    throw error;
  }
}

/**
 * Build a template and send it. Failures are logged but do not throw.
 *
 * @param {object} params
 * @param {string} [params.to] - Recipient address (skipped when empty)
 * @param {string} [params.toName] - Recipient display name
 * @param {() => Promise<{ subject: string, html: string, text?: string }>} params.build
 * @param {string} [params.logTag]
 */
export async function sendTransactionalEmail({
  to,
  toName,
  build,
  logTag = "email",
}) {
  if (!to) return;

  try {
    const payload = await build();
    return await sendEmail({ to, toName, ...payload });
  } catch (err) {
    console.error(`[${logTag}] Failed to send email to "${to}":`, err);
  }
}
