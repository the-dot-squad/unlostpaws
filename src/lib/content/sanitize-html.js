import DOMPurify from "isomorphic-dompurify";

/** Tags allowed in CMS HTML bodies. */
export const ALLOWED_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "strong",
  "em",
  "u",
  "blockquote",
  "br",
  "hr",
  "span",
];

/** Attributes preserved after sanitization. */
export const ALLOWED_ATTR = ["href", "src", "alt", "title", "class", "target", "rel"];

/**
 * Strip unsafe markup before storing or rendering CMS HTML.
 * @param {string} html
 */
export function sanitizeContentHtml(html) {
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Props for rendering CMS HTML that was sanitized with DOMPurify.
 * @param {string} html
 * @returns {{ dangerouslySetInnerHTML: { __html: string } } | null}
 */
export function createSanitizedHtmlProps(html) {
  const safe = sanitizeContentHtml(html);
  if (!safe) return null;
  return { dangerouslySetInnerHTML: { __html: safe } };
}
