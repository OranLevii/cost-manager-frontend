// LocalStorage key for storing settings
const KEY = "cm_settings_v1";

// Default settings values
const DEFAULTS = {
  ratesUrl: "",
};

/**
 * Retrieves settings from localStorage
 * Returns default values if settings don't exist or parsing fails
 * @returns {Object} Settings object with default values merged
 */
export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    // Merge parsed settings with defaults to ensure all keys exist
    return { ...DEFAULTS, ...parsed };
  } catch (e) {
    // Return defaults if parsing fails
    return { ...DEFAULTS };
  }
}

/**
 * Saves settings to localStorage
 * @param {Object} settings - Settings object to save
 */
export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
