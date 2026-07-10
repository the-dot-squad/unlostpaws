/** @file HTML helpers for server-rendered email bodies. */

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailBold(value) {
  return `<strong>${escapeHtml(value)}</strong>`;
}
