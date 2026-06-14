import { sanitizeContentHtml } from "./sanitize";

const LIST_OPEN_RE = /<(ul|ol)(\s[^>]*)?>/i;
const LIST_TAG_RE = /<\/?(ul|ol)(\s[^>]*)?>/gi;

/** Strip tags for plain-text question labels. */
function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Normalize FAQ HTML for storage and parsing — use `<ul>` and trim Jodit trailing blocks.
 * @param {string} html
 */
export function normalizeFaqBody(html) {
  let safe = sanitizeContentHtml(html);
  if (!safe) return "";

  safe = safe.replace(LIST_TAG_RE, (tag) => tag.replace(/\bol\b/i, "ul"));

  // Jodit often appends empty paragraphs after lists.
  safe = safe.replace(/(?:<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*)+$/gi, "").trim();

  return safe;
}

/** Index of the first FAQ list (`<ul>` or `<ol>`). */
function findListStart(html) {
  const match = html.match(LIST_OPEN_RE);
  return match ? match.index : -1;
}

/**
 * Parse FAQ items from CMS HTML.
 *
 * Expected format in the editor:
 * ```html
 * <ul>
 *   <li>How do I post an alert?:Sign in and go to Post Alert.</li>
 *   <li>Is it free?:Yes, the platform is free to use.</li>
 * </ul>
 * ```
 *
 * The first colon in each <li> separates question (plain text) from answer (may include HTML).
 */
export function parseFaqItems(html) {
  const safe = sanitizeContentHtml(html);
  if (!safe) return [];

  const items = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = liRegex.exec(safe)) !== null) {
    const inner = match[1].trim();
    const colonIndex = inner.indexOf(":");
    if (colonIndex === -1) continue;

    const question = stripTags(inner.slice(0, colonIndex));
    const answer = inner.slice(colonIndex + 1).trim();
    if (!question || !answer) continue;

    items.push({
      question,
      // Sanitize on the server — never run DOMPurify inside client components.
      answerHtml: sanitizeContentHtml(answer),
    });
  }

  return items;
}

/**
 * Split optional intro HTML (before the list) from FAQ list items.
 * @returns {{ intro: string, items: { question: string, answerHtml: string }[] }}
 */
export function parseFaqBody(html) {
  const safe = normalizeFaqBody(html);
  const listIndex = findListStart(safe);

  if (listIndex === -1) {
    return { intro: safe, items: [] };
  }

  const intro = safe.slice(0, listIndex).trim();
  const listHtml = safe.slice(listIndex);

  return { intro, items: parseFaqItems(listHtml) };
}
