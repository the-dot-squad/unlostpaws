import "server-only";
import DOMPurify from "isomorphic-dompurify";

/** Tags allowed in CMS HTML bodies. */
const ALLOWED_TAGS = [
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
const ALLOWED_ATTR = ["href", "src", "alt", "title", "class", "target", "rel"];

/**
 * Strip unsafe markup before storing or rendering CMS HTML.
 * Server-only — import from client components will fail at build time.
 * @param {string} html
 */
export function sanitizeContentHtml(html) {
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
