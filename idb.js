(function () {
  "use strict";

  // IndexedDB object store name for cost items
  var STORE_NAME = "costs";
  // Global database reference
  var _db = null;

  /**
   * Retrieves the exchange rates URL from localStorage settings
   * @returns {string} The rates URL or empty string if not found
   */
  function getRatesUrl() {
    try {
      var raw = localStorage.getItem("cm_settings_v1");
      if (!raw) return "";
      var obj = JSON.parse(raw);
      return obj && obj.ratesUrl ? obj.ratesUrl : "";
    } catch (e) {
      return "";
    }
  }

  /**
   * Fetches exchange rates from the configured URL
   * @returns {Promise<Object>} Promise resolving to rates object
   * @throws {Error} If URL is not set or fetch fails
   */
  function fetchRates() {
    var url = getRatesUrl();
    if (!url) return Promise.reject(new Error("Rates URL is not set"));

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Failed to fetch rates");
      return res.json();
    });
  }

  /**
   * Converts an amount from one currency to another using exchange rates
   * @param {number} amount - The amount to convert
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @param {Object} rates - Exchange rates object
   * @returns {number} Converted amount
   * @throws {Error} If currency rates are missing
   */
  function convertAmount(amount, fromCurrency, toCurrency, rates) {
    if (fromCurrency === toCurrency) return amount;

    var fromRate = rates[fromCurrency];
    var toRate = rates[toCurrency];
    if (!fromRate || !toRate) throw new Error("Missing currency rate");

    // Convert to USD first, then to target currency
    var usd = amount / fromRate;
    return usd * toRate;
  }

  /**
   * Retrieves all cost items from the database
   * @returns {Promise<Array>} Promise resolving to array of all costs
   * @throws {Error} If database is not open
   */
  function getAllCosts() {
    return new Promise(function (resolve, reject) {
      if (!_db) return reject(new Error("DB is not open"));

      var tx = _db.transaction(STORE_NAME, "readonly");
      var store = tx.objectStore(STORE_NAME);

      var req = store.getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /**
   * Opens or creates the IndexedDB database for cost management
   * @param {string} databaseName - Name of the database
   * @param {number} databaseVersion - Version number for schema updates
   * @returns {Promise<Object>} Promise resolving to database object with addCost and getReport methods
   */
  function openCostsDB(databaseName, databaseVersion) {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(databaseName, databaseVersion);

      // Handle database schema upgrades
      request.onupgradeneeded = function (event) {
        var db = event.target.result;
        // Create the object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
      };

      // Database opened successfully
      request.onsuccess = function () {
        _db = request.result;
        // Return database interface with available methods
        resolve({ addCost: addCost, getReport: getReport });
      };

      request.onerror = function () { reject(request.error); };
    });
  }

  /**
   * Adds a new cost item to the database
   * Automatically adds current date information
   * @param {Object} cost - Cost object with sum, currency, category, description
   * @returns {Promise<Object>} Promise resolving to saved cost item
   * @throws {Error} If database is not open or save fails
   */
  function addCost(cost) {
    return new Promise(function (resolve, reject) {
      if (!_db) return reject(new Error("DB is not open"));

      var tx = _db.transaction(STORE_NAME, "readwrite");
      var store = tx.objectStore(STORE_NAME);

      // Get current date and create cost item with date information
      var now = new Date();
      var item = {
        sum: Number(cost.sum),
        currency: String(cost.currency),
        category: String(cost.category),
        description: String(cost.description),
        date: { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() },
      };

      var req = store.add(item);
      req.onsuccess = function () {
        resolve({
          sum: item.sum,
          currency: item.currency,
          category: item.category,
          description: item.description,
        });
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  /**
   * Generates a monthly report with costs filtered by year and month
   * Converts all costs to the specified currency
   * @param {number} year - Year to filter by
   * @param {number} month - Month to filter by (1-12)
   * @param {string} currency - Target currency for conversion
   * @returns {Promise<Object>} Promise resolving to report object with costs and total
   */
  function getReport(year, month, currency) {
    return Promise.all([getAllCosts(), fetchRates()]).then(function (arr) {
      var all = arr[0];
      var rates = arr[1];

      // Filter costs by year and month
      var filtered = all.filter(function (c) {
        return c && c.date && c.date.year === year && c.date.month === month;
      });

      // Calculate total by converting all costs to target currency
      var total = 0;
      for (var i = 0; i < filtered.length; i++) {
        var c = filtered[i];
        total += convertAmount(Number(c.sum), c.currency, currency, rates);
      }
      // Round to 2 decimal places
      total = Math.round(total * 100) / 100;

      // Return report with filtered costs and calculated total
      return {
        year: year,
        month: month,
        costs: filtered.map(function (c) {
          return {
            sum: Number(c.sum),
            currency: c.currency,
            category: c.category,
            description: c.description,
            Date: { day: c.date.day },
          };
        }),
        total: { currency: currency, total: total },
      };
    });
  }

  // Expose the database interface to the global window object
  window.idb = { openCostsDB: openCostsDB };
})();
