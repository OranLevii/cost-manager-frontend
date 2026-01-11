(function () {
  "use strict";

  var STORE_NAME = "costs";
  var _db = null;

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

  function fetchRates() {
    var url = getRatesUrl();
    if (!url) return Promise.reject(new Error("Rates URL is not set"));

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Failed to fetch rates");
      return res.json();
    });
  }

  function convertAmount(amount, fromCurrency, toCurrency, rates) {
    if (fromCurrency === toCurrency) return amount;

    var fromRate = rates[fromCurrency];
    var toRate = rates[toCurrency];
    if (!fromRate || !toRate) throw new Error("Missing currency rate");

    var usd = amount / fromRate;
    return usd * toRate;
  }

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

  window.idb = { openCostsDB: openCostsDB };
})();
