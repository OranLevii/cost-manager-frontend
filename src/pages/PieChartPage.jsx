import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { openCostsDB } from "../idb/idb.js";

// Supported currency codes
const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];

// Same default as your idb.js
const DEFAULT_RATES_URL =
  "https://cost-manager-frontend-fg8b.onrender.com/rates.json";

// Same key as your idb.js
const RATES_URL_STORAGE_KEY = "ratesUrl";

// Color palette for pie chart segments
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A28BFF",
  "#FF5A7A",
  "#7DD3FC",
];

async function fetchRatesSameAsIDB() {
  const customUrl = localStorage.getItem(RATES_URL_STORAGE_KEY);
  const url =
    customUrl && customUrl.trim().length > 0
      ? customUrl.trim()
      : DEFAULT_RATES_URL;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  return res.json();
}

// rates are: 1 USD = X currency
function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) throw new Error("Missing currency rate");

  const usd = Number(amount) / fromRate;
  return usd * toRate;
}

/**
 * Builds pie chart data aggregated by category (in targetCurrency)
 * report.costs are original amounts+currencies (as in your idb.js)
 */
function buildCategoryData(report, targetCurrency, rates) {
  const map = {};

  for (let i = 0; i < (report.costs || []).length; i++) {
    const c = report.costs[i];
    const key = c.category || "Other";

    const converted = convertAmount(
      Number(c.sum),
      String(c.currency),
      targetCurrency,
      rates
    );

    map[key] = (map[key] || 0) + converted;
  }

  return Object.keys(map).map((k) => ({
    name: k,
    value: Math.round(map[k] * 100) / 100,
  }));
}

export default function PieChartPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [currency, setCurrency] = useState("USD");

  const [msg, setMsg] = useState(null);
  const [data, setData] = useState([]);

  async function onRun() {
    try {
      setMsg(null);
      setData([]);

      const y = Number(year);
      const m = Number(month);
      if (!Number.isFinite(y) || y < 1900) throw new Error("Invalid year");
      if (!Number.isFinite(m) || m < 1 || m > 12)
        throw new Error("Invalid month (1-12)");

      const rates = await fetchRatesSameAsIDB();

      const db = await openCostsDB("costsdb", 1);

      // IMPORTANT: call signature WITHOUT rates param
      const rep = await db.getReport(y, m, currency);

      const d = buildCategoryData(rep, currency, rates);

      setData(d);
      setMsg({ type: "success", text: "Pie chart data loaded." });
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.message || "Failed to load pie chart.",
      });
    }
  }

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Pie Chart by Category
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: "1fr 1fr 1fr",
            alignItems: "center",
          }}
        >
          <TextField
            label="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <TextField
            label="Month (1-12)"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <FormControl>
            <InputLabel>Currency</InputLabel>
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 1 }}>
            <Button variant="contained" onClick={onRun}>
              Run Pie
            </Button>
          </Box>

          {msg && (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Alert severity={msg.type}>{msg.text}</Alert>
            </Box>
          )}
        </Box>
      </Paper>

      <Paper sx={{ p: 2, height: 420 }}>
        {data.length === 0 ? (
          <Typography>No data for selected month/year.</Typography>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" label>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Box>
  );
}
