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
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { openCostsDB } from "../idb/idb.js";
import { fetchRates } from "../services/ratesService.js";

// Supported currency codes
const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];
// Color palette for pie chart segments
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28BFF", "#FF5A7A", "#7DD3FC"];

/**
 * Builds pie chart data aggregated by category
 * Converts all costs to the target currency
 * @param {Object} report - Report object containing costs array
 * @param {string} targetCurrency - Currency to convert all costs to
 * @param {Object} rates - Exchange rates object
 * @returns {Array} Array of objects with category name and total value
 */
function buildCategoryData(report, targetCurrency, rates) {
  // Map to aggregate costs by category
  const map = {};

  // Process each cost item
  for (let i = 0; i < report.costs.length; i++) {
    const c = report.costs[i];

    // Get exchange rates for conversion
    const fromRate = rates[c.currency];
    const toRate = rates[targetCurrency];
    if (!fromRate || !toRate) continue;

    // Convert to USD first, then to target currency
    const usd = Number(c.sum) / fromRate;
    const converted = usd * toRate;

    // Aggregate by category (default to "Other" if missing)
    const key = c.category || "Other";
    map[key] = (map[key] || 0) + converted;
  }

  // Convert map to array format for pie chart
  return Object.keys(map).map((k) => ({
    name: k,
    value: Math.round(map[k] * 100) / 100,
  }));
}

/**
 * PieChartPage Component
 * Displays a pie chart showing cost distribution by category for a selected month
 * Allows filtering by year, month, and currency
 */
export default function PieChartPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [currency, setCurrency] = useState("USD");

  const [msg, setMsg] = useState(null);
  const [data, setData] = useState([]);

  /**
   * Fetches and processes data for the pie chart
   * Retrieves costs for the selected month and aggregates by category
   */
  function onRun() {
    setMsg(null);
    setData([]);

    // Fetch rates, then get report, then build chart data
    fetchRates()
      .then((rates) =>
        openCostsDB("costsdb", 1).then((db) =>
          db.getReport(Number(year), Number(month), currency, rates).then((rep) => {
            const d = buildCategoryData(rep, currency, rates);
            return { d };
          })
        )
      )
      .then(({ d }) => {
        setData(d);
        setMsg({ type: "success", text: "Pie chart data loaded." });
      })
      .catch((err) => {
        setMsg({ type: "error", text: err?.message || "Failed to load pie chart." });
      });
  }

  // Render the pie chart page with controls and chart visualization
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
          <TextField label="Year" value={year} onChange={(e) => setYear(e.target.value)} />
          <TextField label="Month (1-12)" value={month} onChange={(e) => setMonth(e.target.value)} />

          <FormControl>
            <InputLabel>Currency</InputLabel>
            <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
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
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
