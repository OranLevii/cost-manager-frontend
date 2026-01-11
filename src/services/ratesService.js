import { getSettings } from "./settingsService.js";

// Default local rates file (falls back to GitHub if not available)
const DEFAULT_RATES_URL = "/rates.json";
const FALLBACK_RATES_URL = "https://oranlevii.github.io/cost-manager-rates/rates.json";

/**
 * Fetches exchange rates from the configured URL or falls back to default GitHub URL
 * Retrieves the rates URL from settings and makes a fetch request
 * @returns {Promise<Object>} Promise resolving to exchange rates object
 * @throws {Error} If fetch fails
 */
export function fetchRates() {
  const { ratesUrl } = getSettings();
  
  // Use configured URL or fall back to default local rates file
  const url = ratesUrl || DEFAULT_RATES_URL;

  // Fetch rates from the URL, with fallback to GitHub if local file fails
  return fetch(url).then((res) => {
    if (!res.ok) {
      // If local file fails and we're using default, try GitHub fallback
      if (!ratesUrl && url === DEFAULT_RATES_URL) {
        return fetch(FALLBACK_RATES_URL).then((fallbackRes) => {
          if (!fallbackRes.ok) {
            throw new Error("Failed to fetch rates");
          }
          return fallbackRes.json();
        });
      }
      throw new Error("Failed to fetch rates");
    }
    return res.json();
  });
}
