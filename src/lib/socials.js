/** @file Footer social profile links and GitHub repo resolution. */

/** Canonical fallback when no GitHub URL is stored in app settings. */
export const DEFAULT_GITHUB_REPO_URL = "https://github.com/the-dot-squad/unlostpaws";

/** Platforms excluded from the footer icon row (GitHub uses the text link + stars). */
export const SOCIAL_ICON_PLATFORMS_EXCLUDE = new Set(["github"]);

/**
 * @typedef {{ platform: string, url: string }} SocialLink
 */

/**
 * @param {string} name
 * @returns {string}
 */
export function sanitizeSocialPlatformKey(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

/**
 * @param {SocialLink[] | null | undefined} links
 * @returns {SocialLink[]}
 */
export function normalizeSocialLinkArray(links) {
  if (!Array.isArray(links)) return [];

  const seen = new Set();
  /** @type {SocialLink[]} */
  const result = [];

  for (const item of links) {
    const platform = sanitizeSocialPlatformKey(item?.platform ?? "");
    const url = typeof item?.url === "string" ? item.url.trim() : "";
    if (!platform || !url) continue;
    if (seen.has(platform)) continue;
    seen.add(platform);
    result.push({ platform, url });
  }

  return result;
}

/**
 * @param {SocialLink[]} links
 * @returns {string}
 */
export function getGithubRepoUrl(links) {
  const github = links?.find((link) => link.platform === "github");
  return github?.url || DEFAULT_GITHUB_REPO_URL;
}

/**
 * Merge list rows + optional pending new row (saved via Save settings).
 * @param {SocialLink[]} links
 * @param {string} pendingName
 * @param {string} pendingUrl
 * @returns {{ ok: true, socialLinks: SocialLink[] } | { ok: false, error: string }}
 */
export function prepareSocialLinksForSave(links, pendingName, pendingUrl) {
  const cleaned = normalizeSocialLinkArray(links);
  const name = sanitizeSocialPlatformKey(pendingName);
  const url = pendingUrl.trim();

  if (!name && !url) {
    return { ok: true, socialLinks: cleaned };
  }
  if (!name) {
    return { ok: false, error: "Platform name is required for the new link" };
  }
  if (!url) {
    return { ok: false, error: "URL is required for the new platform" };
  }
  if (!/^[a-z0-9_-]+$/.test(name)) {
    return { ok: false, error: "Platform name may only contain letters, numbers, _ and -" };
  }
  try {
    new URL(url);
  } catch {
    return { ok: false, error: "URL must start with http:// or https://" };
  }

  const withoutDuplicate = cleaned.filter((link) => link.platform !== name);
  return { ok: true, socialLinks: [...withoutDuplicate, { platform: name, url }] };
}
