/**
 * @file Content Library for Next.js
 * Handles fetching page content from the thirdparty DGContent API (Sanity back-end).
 * Utilizes Next.js fetch caching capabilities.
 */

import { env } from "@/config/env";

class Content {
  /**
   * Initializes the content fetcher client.
   * @param {string} language - Default language locale code.
   */
  constructor(language = "en") {
    this.language = language;
    this.config = env.content;
    this.cacheTTL = 3600; // 1 hour default cache TTL
  }

  /**
   * Updates the default language.
   * @param {string} language - Language locale code.
   * @returns {Content} The class instance for chaining.
   */
  setLang(language) {
    this.language = language;
    return this;
  }

  /**
   * Updates the default cache TTL.
   * @param {number} cacheTTL - Cache time-to-live in seconds.
   * @returns {Content} The class instance for chaining.
   */
  setCacheTTL(cacheTTL) {
    if (cacheTTL === null || cacheTTL === undefined || cacheTTL < 1) {
      throw new Error("Cache TTL must be a positive integer.");
    }
    this.cacheTTL = cacheTTL;
    return this;
  }

  /**
   * Retrieves a page by its slug from the DGContent API.
   * @param {string} slug - Page slug (e.g., 'about', 'faq').
   * @param {string|null} language - Specific language code, defaults to instance language.
   * @returns {Promise<Object|null>} The page content object, or null if not found or configured.
   */
  async getPage(slug, language = null) {
    try {
      if (!this.config.apiKey || !this.config.websiteKey) {
        console.warn("DG Content API not properly configured. Missing API key or website key.");
        return null;
      }

      const params = {
        resource: "page",
        slug,
        website: this.config.websiteKey,
      };

      const lang = language || this.language;
      if (lang) {
        params.language = lang;
      }

      const response = await this.#makeRequest(params, "GET", this.cacheTTL);
      return response?.page || null;
    } catch (error) {
      console.error(`Error getting page "${slug}":`, error.message);
      return null;
    }
  }

  /**
   * Performs an HTTP request to the API with Next.js built-in fetch caching.
   * @private
   * @param {Object} params - Query parameters or body data.
   * @param {string} method - HTTP request method.
   * @param {number} cacheTTL - Cache time-to-live in seconds.
   * @returns {Promise<Object>} JSON response from the API.
   */
  async #makeRequest(params, method = "GET", cacheTTL = 3600) {
    try {
      let url = this.config.apiBaseUrl;
      let body = undefined;

      if (method === "GET") {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
        url += `?${queryParams.toString()}`;
      } else {
        body = JSON.stringify(params);
      }

      const fetchOptions = {
        method,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        next: {
          revalidate: cacheTTL,
          tags: ["dg-content", `dg-content-${params.slug || params.resource}`],
        },
      };

      if (method !== "GET") {
        fetchOptions.body = body;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Return null gracefully for non-existent pages
        }
        throw new Error(`API Error: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`API Error: ${data.error}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Error making request to DG Content API: ${error.message}`);
    }
  }
}

export default Content;
