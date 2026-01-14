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

const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function BarChartPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState("USD");
  const [msg, setMsg] = useState(null);
  const [data, setData] = useState([]);

  async function onRun() {
    try {
      setMsg(null);
      setData([]);

      const y = Number(year);
      if (!Number.isFinite(y) || y < 1900) throw new Error("Invalid year");

      const db = await openCostsDB("costsdb", 1);

      // Fetch 12 monthly reports (conversion logic is handled inside idb.js)
      const reports = await Promise.all(
        Array.from({ length: 12 }, (_, i) => db.getReport(y, i + 1, currency))
      );

      // Use the total already calculated in the selected currency
      const d = reports.map((rep, i) => ({
        month: MONTH_NAMES[i],
        total: Math.round(Number(rep?.total?.total || 0) * 100) / 100,
      }));

      setData(d);
      setMsg({ type: "success", text: "Bar chart data loaded." });
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Failed to load bar chart." });
    }
  }

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Yearly Bar Chart
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: "1fr 1fr",
            alignItems: "center",
          }}
        >
          <TextField
            label="Year"
            type="number"
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
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
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
