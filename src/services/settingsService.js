const KEY = "cm_settings_v1";

const DEFAULTS = {
  ratesUrl: "",
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
