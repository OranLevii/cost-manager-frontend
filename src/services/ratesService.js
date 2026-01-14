import { getSettings } from "./settingsService.js";

const DEFAULT_RATES_URL = "/rates.json";

let cache = null;
let cacheUrl = null;

function resolveRatesUrl() {
  const u = (getSettings()?.ratesUrl || "").trim();
  return u.length > 0 ? u : DEFAULT_RATES_URL;
}

export async function fetchRates() {
  const url = resolveRatesUrl();

  if (cache && cacheUrl === url) return cache;

  const isExternal = /^https?:\/\//i.test(url);

  // ✅ If external URL -> go through our proxy endpoint
  const finalUrl = isExternal
    ? `/api/rates?url=${encodeURIComponent(url)}`
    : url;

  let res;
  try {
    res = await fetch(finalUrl, { cache: "no-store" });
  } catch {
    throw new Error("Failed to fetch rates (network/CORS)");
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch rates: HTTP ${res.status}`);
  }

  const rates = await res.json();
  cache = rates;
  cacheUrl = url;
  return rates;
}
