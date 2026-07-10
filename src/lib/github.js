/**
 * Fetch and cache the stargazers count of the platform repository from GitHub.
 * Caches the response for 1 hour (3600 seconds) using Next.js fetch cache.
 * 
 * @param {string} [repoUrl]
 * @returns {Promise<number|null>}
 */
export async function getCachedGithubStars(repoUrl) {
  if (!repoUrl) return null;

  try {
    const urlObj = new URL(repoUrl);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) return null;

    const owner = pathParts[0];
    const repo = pathParts[1].replace(/\.git$/, "");

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`[github-stars] Fetch failed with status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (typeof data?.stargazers_count === "number") {
      return data.stargazers_count;
    }
    return null;
  } catch (err) {
    console.error("[github-stars] Error fetching stargazers:", err);
    return null;
  }
}
