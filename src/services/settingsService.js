// LocalStorage key for storing settings object
const KEY = "cm_settings_v1";

// Compatibility key (some parts of the app read this directly)
const COMPAT_RATES_URL_KEY = "ratesUrl";

// Default settings values
const DEFAULTS = {
  ratesUrl: "",
};

/**
 * Retrieves settings from localStorage.
 * Falls back to COMPAT_RATES_URL_KEY if needed.
 * @returns {Object} Settings object with default values merged
 */
export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULTS, ...parsed };

      // If ratesUrl missing/empty in cm_settings_v1, try compat key
      if (!merged.ratesUrl || !merged.ratesUrl.trim()) {
        const compat = localStorage.getItem(COMPAT_RATES_URL_KEY) || "";
        merged.ratesUrl = compat;
      }

      return merged;
    }
  } catch (e) {
    // ignore, fallback below
  }

  // No cm_settings_v1 or parsing failed -> try compat key
  const compat = localStorage.getItem(COMPAT_RATES_URL_KEY) || "";
  return { ...DEFAULTS, ratesUrl: compat };
}

/**
 * Saves settings to localStorage.
 * Also writes ratesUrl to a compatibility key so other modules can read it.
 * @param {Object} settings - Settings object to save
 */
export function saveSettings(settings) {
  const safe = { ...DEFAULTS, ...(settings || {}) };
  localStorage.setItem(KEY, JSON.stringify(safe));

  // Keep a direct key for older/other code paths (like idb.js / tests)
  localStorage.setItem(COMPAT_RATES_URL_KEY, safe.ratesUrl || "");
}
