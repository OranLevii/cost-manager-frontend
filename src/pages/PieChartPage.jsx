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

// Same currency codes as Report/Bar
const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];

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

/**
 * Build pie data aggregated by category, in TARGET currency.
 * We rely on idb.getReport(...) to already do conversion and return:
 *  - report.total.currency = target currency
 *  - report.costs[i].convertedSum = converted amount in target currency
 */
function buildCategoryData(report) {
  const map = {};

  for (const c of report?.costs || []) {
    const key = c.category || "Other";
    const v = Number(c.convertedSum ?? 0);
    map[key] = (map[key] || 0) + v;
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
  const [targetCurrency, setTargetCurrency] = useState("USD");

  async function onRun() {
    try {
      setMsg(null);
      setData([]);

      const y = Number(year);
      const m = Number(month);

      if (!Number.isFinite(y) || y < 1900) throw new Error("Invalid year");
      if (!Number.isFinite(m) || m < 1 || m > 12)
        throw new Error("Invalid month (1-12)");

      const db = await openCostsDB("costsdb", 1);

      const rep = await db.getReport(y, m, currency);

      const chartData = buildCategoryData(rep);
      setData(chartData);
      setTargetCurrency(rep?.total?.currency || currency);

      if (chartData.length === 0) {
        setMsg({ type: "info", text: "No data for selected month/year." });
      } else {
        setMsg({ type: "success", text: "Pie chart loaded." });
      }
    } catch (err) {
      console.error("PIE FAILED", err);
      setMsg({
        type: "error",
        text: err?.message || "Failed to load pie chart.",
      });
    }
  }

  const hasData = data.some((x) => Number(x.value) > 0);

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
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <TextField
            label="Month (1-12)"
            type="number"
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
        {!hasData ? (
          <Typography>No data to display ({targetCurrency}).</Typography>
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
