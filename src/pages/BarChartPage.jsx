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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { openCostsDB } from "../idb/idb.js";
import { fetchRates } from "../services/ratesService.js";

// Supported currency codes
const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];

// Month names for display in the chart
const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

/**
 * Builds yearly data aggregated by month for the bar chart
 * @param {Array} allCosts - Array of all cost items
 * @param {number} year - The year to filter costs by
 * @param {string} targetCurrency - Currency to convert all costs to
 * @param {Object} rates - Exchange rates object (e.g., { USD: 1, ILS: 3.4 })
 * @returns {Array} Array of objects with month name and total amount
 */
function buildYearData(allCosts, year, targetCurrency, rates) {
  // Initialize array with 12 zeros (one for each month)
  const totals = Array(12).fill(0);

  // Process each cost item
  for (let i = 0; i < allCosts.length; i++) {
    const c = allCosts[i];
    // Skip costs that don't match the target year
    if (c?.date?.year !== year) continue;

    // Get exchange rates for conversion
    const fromRate = rates[c.currency];
    const toRate = rates[targetCurrency];
    if (!fromRate || !toRate) continue;

    // Convert to USD first, then to target currency
    const usd = Number(c.sum) / fromRate;
    const converted = usd * toRate;

    // Convert month from 1-12 to 0-11 for array indexing
    const m = c.date.month - 1; // 0-11
    if (m >= 0 && m < 12) {
      totals[m] += converted;
    }
  }

  // Map totals to chart data format with month names and rounded values
  return totals.map((v, i) => ({
    month: MONTH_NAMES[i],
    total: Math.round(v * 100) / 100,
  }));
}

/**
 * BarChartPage Component
 * Displays a bar chart showing monthly costs for a selected year
 * Allows filtering by year and currency
 */
export default function BarChartPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState("USD");

  const [msg, setMsg] = useState(null);
  const [data, setData] = useState([]);

  /**
   * Fetches and processes data for the bar chart
   * Retrieves costs for all 12 months of the selected year
   */
  function onRun() {
    setMsg(null);
    setData([]);

    fetchRates()
      .then((rates) =>
        openCostsDB("costsdb", 1).then((db) =>
          // Fetch all data through getReport for each month
          Promise.all(
            Array.from({ length: 12 }, (_, i) =>
              db.getReport(year, i + 1, currency, rates)
            )
          ).then((reports) => {
            // Combine all costs from all months
            const allCosts = reports.flatMap((r) =>
              r.costs.map((c) => ({
                ...c,
                date: { year, month: reports.indexOf(r) + 1 },
              }))
            );
            return buildYearData(allCosts, year, currency, rates);
          })
        )
      )
      .then((d) => {
        setData(d);
        setMsg({ type: "success", text: "Bar chart data loaded." });
      })
      .catch((err) => {
        setMsg({ type: "error", text: err?.message || "Failed to load bar chart." });
      });
  }

  // Render the bar chart page with controls and chart visualization
  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Yearly Bar Chart
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr", alignItems: "center" }}>
          <TextField
            label="Year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />

          <FormControl>
            <InputLabel>Currency</InputLabel>
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ gridColumn: "1 / -1", display: "flex", gap: 1 }}>
            <Button variant="contained" onClick={onRun}>
              Run Bar
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
          <Typography>No data for selected year.</Typography>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#1976d2" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Box>
  );
}
