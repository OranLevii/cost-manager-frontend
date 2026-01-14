import { getSettings } from "./settingsService.js";

// Default local rates file (optional)
const DEFAULT_RATES_URL = "/rates.json";

// Always-available fallback on the web
const FALLBACK_RATES_URL =
  "https://oranlevii.github.io/cost-manager-rates/rates.json";

// Cache (avoid refetching on every click)
let cache = null;
let cacheUrl = null;

function resolveRatesUrl() {
  const s = getSettings();
  const u = (s?.ratesUrl || "").trim();

  // If user configured a URL -> use it
  if (u.length > 0) return u;

  // Otherwise try local (Render/public) first
  return DEFAULT_RATES_URL;
}

/**
 * Fetches exchange rates from:
 * 1) Settings URL (if provided)
 * 2) /rates.json (local)
 * 3) GitHub fallback URL
 */
export async function fetchRates() {
  const url = resolveRatesUrl();

  // Cache by URL (if URL changed -> refetch)
  if (cache && cacheUrl === url) return cache;

  // Try primary URL
  let res = await fetch(url);

  // If local failed and settings not provided -> try GitHub fallback
  const settingsUrl = (getSettings()?.ratesUrl || "").trim();
  const usingLocalDefault = !settingsUrl && url === DEFAULT_RATES_URL;

  if (!res.ok && usingLocalDefault) {
    res = await fetch(FALLBACK_RATES_URL);
  }

  if (!res.ok) {
    throw new Error("Failed to fetch rates");
  }

  const rates = await res.json();

  cache = rates;
  cacheUrl = url;
  return rates;
}
