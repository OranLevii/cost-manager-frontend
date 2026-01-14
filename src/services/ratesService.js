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

  const res = await fetch(url, { cache: "no-store" }); // למנוע קאש “מוזר”
  if (!res.ok) {
    throw new Error(`Failed to fetch rates: HTTP ${res.status} from ${url}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    // לא חובה, אבל עוזר לעלות על URL שמחזיר HTML
    throw new Error(`Rates URL did not return JSON (content-type: ${contentType})`);
  }

  const rates = await res.json();
  cache = rates;
  cacheUrl = url;
  return rates;
}
