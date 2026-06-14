/** @file XML escaping helpers for syndication feeds. */

/**
 * Escape text for XML element content.
 * @param {string | null | undefined} value
 */
export function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wrap HTML in a CDATA section, splitting on `]]>` per XML spec.
 * @param {string} html
 */
export function cdata(html) {
  return `<![CDATA[${String(html).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}
