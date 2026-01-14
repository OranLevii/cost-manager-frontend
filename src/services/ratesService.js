import { getSettings } from "./settingsService.js";

// Default exchange rates URL (same as in idb.js)
const DEFAULT_RATES_URL =
  "https://oranlevii.github.io/cost-manager-rates/rates.json";

let cache = null;
let cacheUrl = null;

function resolveRatesUrl() {
  const s = getSettings();
  const u = (s?.ratesUrl || "").trim();
  return u.length > 0 ? u : DEFAULT_RATES_URL;
}

/**
 * Fetch exchange rates JSON.
 * Uses Settings URL if provided, otherwise falls back to DEFAULT_RATES_URL.
 * Caches by URL so changing the URL refreshes the cache automatically.
 */
export async function fetchRates() {
  const url = resolveRatesUrl();

  if (cache && cacheUrl === url) return cache;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch exchange rates");

  const rates = await res.json();
  cache = rates;
  cacheUrl = url;
  return rates;
}

/**
 * Optional: clear cache (useful if you want a "Refresh" button)
 */
export function clearRatesCache() {
  cache = null;
  cacheUrl = null;
}
