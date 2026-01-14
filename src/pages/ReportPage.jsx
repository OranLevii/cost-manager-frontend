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
import { openCostsDB } from "../idb/idb.js";

// Supported currency codes
const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];

export default function ReportPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [currency, setCurrency] = useState("USD");

  const [msg, setMsg] = useState(null);
  const [report, setReport] = useState(null);

  async function onRunReport() {
    try {
      setMsg(null);
      setReport(null);

      const y = Number(year);
      const m = Number(month);

      if (!Number.isFinite(y) || y < 1900) throw new Error("Invalid year");
      if (!Number.isFinite(m) || m < 1 || m > 12) throw new Error("Invalid month (1-12)");

      const db = await openCostsDB("costsdb", 1);

      // Single source of truth for currency conversions is idb.js (includes DEFAULT_RATES_URL + settings)
      const rep = await db.getReport(y, m, currency);

      setReport(rep);
      setMsg({ type: "success", text: "Report loaded." });
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Failed to load report." });
    }
  }

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Monthly Report
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
            <Button variant="contained" onClick={onRunReport}>
              Run Report
            </Button>
          </Box>

          {msg && (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Alert severity={msg.type}>{msg.text}</Alert>
            </Box>
          )}
        </Box>
      </Paper>

      {report && (
        <Paper sx={{ p: 2 }}>
          <Typography sx={{ mb: 1 }}>
            Total: <b>{report.total?.total ?? 0}</b> {report.total?.currency ?? currency}
          </Typography>

          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>
                  Day
                </Box>
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>
                  Sum
                </Box>
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>
                  Currency
                </Box>
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>
                  Category
                </Box>
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>
                  Description
                </Box>
              </Box>
            </Box>

            <Box component="tbody">
              {(report.costs || []).map((c, idx) => (
                <Box component="tr" key={idx}>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>
                    {c.Date?.day ?? ""}
                  </Box>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>
                    {c.sum}
                  </Box>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>
                    {c.currency}
                  </Box>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>
                    {c.category}
                  </Box>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>
                    {c.description}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
