import { getSettings } from "./settingsService.js";

export function fetchRates() {
  const { ratesUrl } = getSettings();

  if (!ratesUrl) {
    return Promise.reject(new Error("Rates URL is not set"));
  }

  return fetch(ratesUrl).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch rates");
    }
    return res.json();
  });
}
