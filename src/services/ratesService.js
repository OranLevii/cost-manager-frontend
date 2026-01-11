import { getSettings } from "./settingsService.js";

/**
 * Fetches exchange rates from the configured URL
 * Retrieves the rates URL from settings and makes a fetch request
 * @returns {Promise<Object>} Promise resolving to exchange rates object
 * @throws {Error} If rates URL is not set or fetch fails
 */
export function fetchRates() {
  const { ratesUrl } = getSettings();

  // Validate that rates URL is configured
  if (!ratesUrl) {
    return Promise.reject(new Error("Rates URL is not set"));
  }

  // Fetch rates from the configured URL
  return fetch(ratesUrl).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch rates");
    }
    return res.json();
  });
}
