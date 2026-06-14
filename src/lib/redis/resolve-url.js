/**
 * Resolve a Redis URL from env, optionally injecting REDIS_PASSWORD when the URL
 * has no credentials embedded.
 */

/**
 * @param {string | undefined} url
 * @param {string | undefined} [password]
 * @returns {string}
 */
export function resolveRedisUrl(url, password) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  const pwd = password?.trim();
  if (!pwd) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.password || parsed.username) return trimmed;
    parsed.password = pwd;
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

/**
 * @param {string} url
 * @returns {import("ioredis").RedisOptions}
 */
export function redisConnectionOptions(url) {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(url.startsWith("rediss://") ? { tls: {} } : {}),
  };
}
