(function () {
  "use strict";

  // IndexedDB object store name for cost items
  var STORE_NAME = "costs";

  // Settings keys
  var SETTINGS_KEY = "cm_settings_v1";
  var COMPAT_RATES_URL_KEY = "ratesUrl";

  // Default exchange rates URL (always works on the web)
  var DEFAULT_RATES_URL = "https://oranlevii.github.io/cost-manager-rates/rates.json";

  // Global database reference
  var _db = null;

  // Cache exchange rates by URL
  var _ratesCache = null;
  var _ratesCacheUrl = null;

  /**
   * Resolve rates URL from:
   * 1) cm_settings_v1.ratesUrl
   * 2) localStorage['ratesUrl']
   * 3) DEFAULT_RATES_URL
   */
  function resolveRatesUrl() {
    // 1) settings object
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        var obj = JSON.parse(raw);
        var sUrl = obj && typeof obj.ratesUrl === "string" ? obj.ratesUrl.trim() : "";
        if (sUrl) return sUrl;
      }
    } catch (e) {
      // ignore
    }

    // 2) compat key
    var direct = localStorage.getItem(COMPAT_RATES_URL_KEY);
    if (direct && direct.trim()) return direct.trim();

    // 3) default
    return DEFAULT_RATES_URL;
  }

  /**
   * Fetches exchange rates from resolved URL (with cache by URL).
   * @returns {Promise<Object>} rates
   */
  function fetchRates() {
    var url = resolveRatesUrl();

    if (_ratesCache && _ratesCacheUrl === url) {
      return Promise.resolve(_ratesCache);
    }

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Failed to fetch rates");
      return res.json();
    }).then(function (rates) {
      _ratesCache = rates;
      _ratesCacheUrl = url;
      return rates;
    });
  }

  /**
   * Converts an amount from one currency to another using exchange rates
   * Rates: 1 USD = X currency (USD:1, ILS:3.4, EURO:0.7, GBP:0.6)
   */
  function convertAmount(amount, fromCurrency, toCurrency, rates) {
    if (fromCurrency === toCurrency) return amount;

    var fromRate = rates[fromCurrency];
    var toRate = rates[toCurrency];
    if (!fromRate || !toRate) throw new Error("Missing currency rate");

    var usd = amount / fromRate;
    return usd * toRate;
  }

  /**
   * Retrieves all cost items from the database
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
   * @returns {Promise<{addCost: Function, getReport: Function}>}
   */
  function openCostsDB(databaseName, databaseVersion) {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(databaseName, databaseVersion);

      request.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
      };

      request.onsuccess = function () {
        _db = request.result;
        resolve({ addCost: addCost, getReport: getReport });
      };

      request.onerror = function () { reject(request.error); };
    });
  }

  /**
   * Adds a new cost item to the database.
   * Returns ONLY: sum, currency, category, description (per spec).
   */
  function addCost(cost) {
    return new Promise(function (resolve, reject) {
      if (!_db) return reject(new Error("DB is not open"));

      var tx = _db.transaction(STORE_NAME, "readwrite");
      var store = tx.objectStore(STORE_NAME);

      var now = new Date();
      var item = {
        sum: Number(cost.sum),
        currency: String(cost.currency),
        category: String(cost.category),
        description: String(cost.description),

        // internal date meta for filtering (stored in DB)
        date: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
        },
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
   * getReport(year, month, currency)
   * Returns costs in ORIGINAL currencies, and total converted to requested currency.
   */
  function getReport(year, month, currency) {
    return Promise.all([getAllCosts(), fetchRates()]).then(function (arr) {
      var all = arr[0];
      var rates = arr[1];

      var filtered = all.filter(function (c) {
        return c && c.date && c.date.year === year && c.date.month === month;
      });

      var total = 0;
      for (var i = 0; i < filtered.length; i++) {
        var c = filtered[i];
        total += convertAmount(Number(c.sum), c.currency, currency, rates);
      }
      total = Math.round(total * 100) / 100;

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

  // Expose to global
  window.idb = { openCostsDB: openCostsDB };
})();
