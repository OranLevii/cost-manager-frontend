const STORE_NAME = "costs";

function getAllCosts(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  if (!fromRate || !toRate) {
    throw new Error("Missing currency rate");
  }

  // rates are like: { USD:1, ILS:3.4, EURO:0.7, GBP:0.6 } meaning: 1 USD = X currency
  // convert to USD first:
  const usd = amount / fromRate;
  // then from USD to target:
  return usd * toRate;
}

export function openCostsDB(databaseName, databaseVersion) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      resolve({
        addCost(cost) {
          return new Promise((res, rej) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);

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

        // year: number, month: number (1-12), currency: string
        // rates: object like { USD:1, ILS:3.4, GBP:0.6, EURO:0.7 }
        getReport(year, month, currency, rates) {
          return getAllCosts(db).then((all) => {
            const filtered = all.filter((c) => {
              return c?.date?.year === year && c?.date?.month === month;
            });

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

            // round to 2 decimals for display/report (optional)
            total = Math.round(total * 100) / 100;

            return {
              year,
              month,
              costs: filtered.map((c) => ({
                sum: Number(c.sum),
                currency: c.currency,
                category: c.category,
                description: c.description,
                Date: { day: c?.date?.day }, // keep spec-like
              })),
              total: { currency, total },
            };
          });
        },
      });
    };

    request.onerror = () => reject(request.error);
  });
}
