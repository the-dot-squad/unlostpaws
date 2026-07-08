import { env } from "@/config/env";

const baseUrl = env.app.url;

/**
 * Standard transactional email layout wrapper based on premium React Email design.
 * Automatically handles responsive layouts, Inter fonts, brand colors, and RTL localization.
 *
 * @param {object} params
 * @param {string} params.subject - Page title / HTML title
 * @param {string} params.previewText - Hidden preview snippet visible in email clients
 * @param {string} params.heading - Large bold primary header inside the card
 * @param {string} params.bodyHtml - Primary HTML body content
 * @param {string} [params.ctaUrl] - Action button link destination
 * @param {string} [params.ctaLabel] - Action button text
 * @param {string} [params.locale] - Language locale ("en" or "fa")
 */
export function wrapEmail(options) {
  const {
    subject,
    previewText,
    heading,
    bodyHtml,
    ctaUrl,
    ctaLabel,
    locale = "en",
  } = options;
  const isRtl = locale === "fa";
  const dir = isRtl ? "rtl" : "ltr";
  const align = isRtl ? "right" : "left";
  const primaryColor = "#2563eb"; // UnLostPaws premium brand color (blue/indigo)
  
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="${dir}" lang="${locale}">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${subject}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #f3f4f6;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }
      .container {
        max-width: 580px;
        margin: 30px auto;
        background-color: #ffffff;
        border-radius: 16px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        overflow: hidden;
      }
      .accent-bar {
        height: 6px;
        background-color: ${primaryColor};
      }
      .header {
        padding: 36px 40px 16px 40px;
        text-align: center;
        border-bottom: 1px dashed #e5e7eb;
      }
      .logo {
        height: 48px;
        width: auto;
        display: inline-block;
      }
      .content {
        padding: 32px 40px;
        text-align: ${align};
      }
      .heading {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        margin-top: 0;
        margin-bottom: 20px;
        line-height: 1.3;
      }
      .body-text {
        font-size: 15px;
        line-height: 1.6;
        color: #4b5563;
        margin-top: 0;
        margin-bottom: 24px;
      }
      .callout-box {
        background-color: #f9fafb;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #f3f4f6;
        margin-bottom: 24px;
        text-align: ${align};
      }
      .btn-container {
        text-align: center;
        margin: 28px 0;
      }
      .btn {
        background-color: ${primaryColor};
        border-radius: 8px;
        color: #ffffff !important;
        display: inline-block;
        font-size: 15px;
        font-weight: 600;
        line-height: 50px;
        text-align: center;
        text-decoration: none;
        width: 100%;
        max-width: 240px;
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
      }
      .footer {
        padding: 32px 40px;
        background-color: #f9fafb;
        border-top: 1px solid #f3f4f6;
        text-align: center;
      }
      .footer-text {
        font-size: 12px;
        line-height: 1.6;
        color: #9ca3af;
        margin: 0 0 8px 0;
      }
      .footer-links {
        margin-top: 16px;
      }
      .footer-link {
        color: #9ca3af;
        text-decoration: underline;
        margin: 0 8px;
      }
      ul {
        padding-left: 20px;
        margin-top: 0;
        margin-bottom: 0;
      }
      li {
        margin-bottom: 8px;
        font-size: 14.5px;
        line-height: 1.5;
        color: #4b5563;
      }
      a {
        color: ${primaryColor};
        text-decoration: none;
      }
      strong {
        color: #111827;
      }
    </style>
  </head>
  <body>
    <!-- Hidden preview text for inbox summary -->
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
      ${previewText}
    </div>
    
    <div class="container">
      <div class="accent-bar"></div>
      <div class="header">
        <img class="logo" src="${baseUrl}/logo-compressed.png" alt="UnLostPaws" />
      </div>
      <div class="content">
        <h1 class="heading">${heading}</h1>
        <div class="body-text">
          ${bodyHtml}
        </div>
        ${
          ctaUrl && ctaLabel
            ? `<div class="btn-container">
                 <a class="btn" href="${ctaUrl}" target="_blank">${ctaLabel}</a>
               </div>`
            : ""
        }
      </div>
      <div class="footer">
        <p class="footer-text">
          ${locale === "fa" 
            ? "شما این ایمیل را دریافت کردید زیرا در UnLostPaws عضو هستید." 
            : "You received this email because you are registered on UnLostPaws."}
        </p>
        <p class="footer-text">
          © 2026 UnLostPaws. All rights reserved.
        </p>
        <div class="footer-links">
          <a class="footer-link" href="${baseUrl}/${locale}/terms">${locale === "fa" ? "شرایط استفاده" : "Terms"}</a>
          <a class="footer-link" href="${baseUrl}/${locale}/faq">${locale === "fa" ? "سؤالات متداول" : "FAQ"}</a>
        </div>
      </div>
    </div>
  </body>
</html>`;
}
