/** Stable third-party API and CDN endpoints (not deployment-specific). */

export const MAP_TILE_URLS = {
  light: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

export const EMAIL_API_URLS = {
  mailtrapSandbox: "https://sandbox.api.mailtrap.io",
  mailjetSend: "https://api.mailjet.com/v3.1/send",
  zeptomailSend: "https://api.zeptomail.com/v1.1/email",
};
