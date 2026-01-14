// IndexedDB object store name
const STORE_NAME = "costs";

// Default exchange rates URL (must return JSON like:
// { "USD":1, "GBP":0.6, "EURO":0.7, "ILS":3.4 })
const DEFAULT_RATES_URL =
  "https://oranlevii.github.io/cost-manager-rates/rates.json";

// LocalStorage keys
const SETTINGS_KEY = "cm_settings_v1";
const RATES_URL_STORAGE_KEY = "ratesUrl";

// Cache for exchange rates to avoid repeated fetch calls
let ratesCache = null;
let ratesCacheUrl = null;

/**
 * Resolve the rates URL from settings (preferred), then compat key, then default.
 */
function resolveRatesUrl() {
  // 1) Try cm_settings_v1 (preferred)
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const sUrl = parsed?.ratesUrl;
      if (typeof sUrl === "string" && sUrl.trim().length > 0) {
        return sUrl.trim();
      }
    }
  } catch (e) {
    // ignore and fallback
  }

  // 2) Try direct key (compat)
  const direct = localStorage.getItem(RATES_URL_STORAGE_KEY);
  if (direct && direct.trim().length > 0) return direct.trim();

  // 3) Default
  return DEFAULT_RATES_URL;
}

/**
 * Fetches exchange rates from either a user-defined URL (Settings) or the default URL.
 * If rates were already fetched for the SAME URL, returns them from cache.
 * @returns {Promise<Object>} Exchange rates object
 */
async function fetchRates() {
  const url = resolveRatesUrl();

  // If cache exists but URL changed -> invalidate cache
  if (ratesCache && ratesCacheUrl === url) {
    return ratesCache;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch exchange rates");
  }

  const rates = await response.json();
  ratesCache = rates;
  ratesCacheUrl = url;
  return rates;
}

/**
 * Converts an amount between currencies using rates relative to USD.
 * Rates are like: { USD:1, ILS:3.4, EURO:0.7, GBP:0.6 } meaning 1 USD = X currency.
 * @param {number} amount - Original amount
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @param {Object} rates - Exchange rates
 * @returns {number} Converted amount
 */
function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) {
    throw new Error("Missing currency rate");
  }
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

/**
 * Retrieves all cost items from the database.
 * @param {IDBDatabase} db - The IndexedDB database instance
 * @returns {Promise<Array>} Promise resolving to array of all cost items
 */
function getAllCosts(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Opens or creates the IndexedDB database for cost management.
 * This is the React/module version (uses export).
 * @param {string} databaseName - Name of the database
 * @param {number} databaseVersion - Version number for schema updates
 * @returns {Promise<Object>} Promise resolving to database object with addCost and getReport methods
 */
export function openCostsDB(databaseName, databaseVersion) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    // Handle database schema creation/upgrade
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create the object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    // Database opened successfully
    request.onsuccess = () => {
      const db = request.result;

      resolve({
        /**
         * Adds a new cost item to the database.
         * The date attached to every cost item is the date on which it was added.
         * @param {Object} cost - Cost object with sum, currency, category, description
         * @returns {Promise<Object>} Promise resolving to saved cost item
         */
        addCost(cost) {
          return new Promise((res, rej) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const now = new Date();

            const item = {
              sum: Number(cost.sum),
              currency: String(cost.currency),
              category: String(cost.category),
              description: String(cost.description),
              Date: { day: now.getDate() },
              // Internal metadata used for year/month filtering
              _dateMeta: {
                year: now.getFullYear(),
                month: now.getMonth() + 1,
                day: now.getDate(),
              },
            };

            const req = store.add(item);
            req.onsuccess = () => res(item);
            req.onerror = () => rej(req.error);
          });
        },

        /**
         * Generates a monthly report with costs filtered by year and month.
         * Signature must stay exactly: getReport(year, month, currency).
         * @param {number} year - Year to filter by
         * @param {number} month - Month to filter by (1-12)
         * @param {string} currency - Target currency for conversion
         * @returns {Promise<Object>} Promise resolving to report object with costs and total
         */
        async getReport(year, month, currency) {
          const all = await getAllCosts(db);

          // Filter costs by year and month
          const filtered = all.filter((c) => {
            return (
              c &&
              c._dateMeta &&
              c._dateMeta.year === year &&
              c._dateMeta.month === month
            );
          });

          // Fetch rates (settings -> ratesUrl -> default)
          const rates = await fetchRates();

          let total = 0;
          const costs = filtered.map((c) => {
            const converted = convertAmount(
              Number(c.sum),
              c.currency,
              currency,
              rates
            );
            total += converted;

            return {
              sum: Number(c.sum),
              currency: c.currency,
              category: c.category,
              description: c.description,
              Date: { day: c._dateMeta.day },
            };
          });

          total = Math.round(total * 100) / 100;

          return {
            year,
            month,
            costs,
            total: { currency, total },
          };
        },
      });
    };

    request.onerror = () => reject(request.error);
  });
}
