// IndexedDB object store name for cost items
const STORE_NAME = "costs";

/**
 * Retrieves all cost items from the database
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
 * Converts an amount from one currency to another using exchange rates
 * Rates are relative to USD (e.g., { USD: 1, ILS: 3.4 } means 1 USD = 3.4 ILS)
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Object} rates - Exchange rates object
 * @returns {number} Converted amount
 * @throws {Error} If currency rates are missing
 */
function convertAmount(amount, fromCurrency, toCurrency, rates) {
  // No conversion needed if currencies match
  if (fromCurrency === toCurrency) return amount;

  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  if (!fromRate || !toRate) {
    throw new Error("Missing currency rate");
  }

  // Rates are like: { USD:1, ILS:3.4, EURO:0.7, GBP:0.6 } meaning: 1 USD = X currency
  // Convert to USD first:
  const usd = amount / fromRate;
  // Then from USD to target currency:
  return usd * toRate;
}

/**
 * Opens or creates the IndexedDB database for cost management
 * Handles database schema creation and upgrades
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

      // Return database interface with available methods
      resolve({
        /**
         * Adds a new cost item to the database
         * Automatically adds current date information
         * @param {Object} cost - Cost object with sum, currency, category, description
         * @returns {Promise<Object>} Promise resolving to saved cost item with date
         */
        addCost(cost) {
          return new Promise((res, rej) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);

            // Add current date to the cost item
            const now = new Date();
            const item = {
              ...cost,
              date: {
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
         * Generates a monthly report with costs filtered by year and month
         * Converts all costs to the specified currency
         * @param {number} year - Year to filter by
         * @param {number} month - Month to filter by (1-12)
         * @param {string} currency - Target currency for conversion
         * @param {Object} rates - Exchange rates object like { USD:1, ILS:3.4, GBP:0.6, EURO:0.7 }
         * @returns {Promise<Object>} Promise resolving to report object with costs and total
         */
        getReport(year, month, currency, rates) {
          return getAllCosts(db).then((all) => {
            // Filter costs by year and month
            const filtered = all.filter((c) => {
              return c?.date?.year === year && c?.date?.month === month;
            });

            // Calculate total by converting all costs to target currency
            let total = 0;
            for (let i = 0; i < filtered.length; i++) {
              const c = filtered[i];
              const converted = convertAmount(
                Number(c.sum),
                c.currency,
                currency,
                rates
              );
              total += converted;
            }

            // Round to 2 decimals for display/report
            total = Math.round(total * 100) / 100;

            // Return report with filtered costs and calculated total
            return {
              year,
              month,
              costs: filtered.map((c) => ({
                sum: Number(c.sum),
                currency: c.currency,
                category: c.category,
                description: c.description,
                Date: { day: c?.date?.day }, // Keep spec-like format
              })),
              total: { currency, total },
            };
          });
        },
      });
    };

    // Handle database open errors
    request.onerror = () => reject(request.error);
  });
}
