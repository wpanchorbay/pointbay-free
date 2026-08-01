// src/utils/apiFetch.ts
import apiFetch, { APIFetchOptions } from "@wordpress/api-fetch";
import { PointBayStore } from "./types";

declare global {
  interface Window {
    /**
     * The main data object localized from PHP by wp_localize_script.
     */
    pointbay_Localize?: PointBayStore;
  }
}

const { nonce, rest_url } = window?.pointbay_Localize || {};

/**
 * Custom wrapper for apiFetch.
 * Automatically appends the plugin's base REST URL so you only need to provide relative paths (e.g., path: 'settings').
 */
const customApiFetch = (options: APIFetchOptions) => {
  const fetchOptions = { ...options };

  // If a relative path is provided, construct the full URL using our localized rest_url
  if (fetchOptions.path && rest_url) {
    const baseUrl = rest_url.endsWith("/") ? rest_url : rest_url + "/";
    const cleanPath = fetchOptions.path.replace(/^\//, "");
    
    fetchOptions.url = baseUrl + cleanPath;
    delete fetchOptions.path; // Remove path to force apiFetch to use the absolute url
  }

  // Ensure our specific nonce is included, in case the global wpApiSettings isn't available
  if (nonce) {
    fetchOptions.headers = {
      "X-WP-Nonce": nonce,
      ...fetchOptions.headers,
    };
  }

  return apiFetch(fetchOptions);
};

export default customApiFetch;
