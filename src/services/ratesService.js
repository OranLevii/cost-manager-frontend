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

  let res;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error("Failed to fetch exchange rates (network / CORS error)");
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch exchange rates (HTTP ${res.status})`);
  }

  let rates;
  try {
    rates = await res.json();
  } catch {
    throw new Error("The provided URL does not return a valid JSON file");
  }

  cache = rates;
  cacheUrl = url;
  return rates;
}
