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

const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function buildYearData(allCosts, year, targetCurrency, rates) {
  const totals = Array(12).fill(0);

  for (let i = 0; i < allCosts.length; i++) {
    const c = allCosts[i];
    if (c?.date?.year !== year) continue;

    const fromRate = rates[c.currency];
    const toRate = rates[targetCurrency];
    if (!fromRate || !toRate) continue;

    const usd = Number(c.sum) / fromRate;
    const converted = usd * toRate;

    const m = c.date.month - 1; // 0-11
    if (m >= 0 && m < 12) {
      totals[m] += converted;
    }
  }

  return totals.map((v, i) => ({
    month: MONTH_NAMES[i],
    total: Math.round(v * 100) / 100,
  }));
}

export default function BarChartPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState("USD");

  const [msg, setMsg] = useState(null);
  const [data, setData] = useState([]);

  function onRun() {
    setMsg(null);
    setData([]);

    fetchRates()
      .then((rates) =>
        openCostsDB("costsdb", 1).then((db) =>
          // נשלוף את כל הנתונים דרך getReport לכל חודש
          Promise.all(
            Array.from({ length: 12 }, (_, i) =>
              db.getReport(year, i + 1, currency, rates)
            )
          ).then((reports) => {
            // מאחדים את כל ה-costs מכל החודשים
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
