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
import { fetchRates } from "../services/ratesService.js";

// Supported currency codes
const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];

/**
 * ReportPage Component
 * Displays a detailed monthly report with all cost items
 * Shows costs in a table format with total summary
 * Allows filtering by year, month, and currency
 */
export default function ReportPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [currency, setCurrency] = useState("USD");

  const [msg, setMsg] = useState(null);
  const [report, setReport] = useState(null);

  /**
   * Fetches and displays the monthly report
   * Retrieves costs for the selected year and month, converted to selected currency
   */
  function onRunReport() {
    setMsg(null);
    setReport(null);

    // Fetch exchange rates, then get report from database
    fetchRates()
      .then((rates) => openCostsDB("costsdb", 1).then((db) => db.getReport(Number(year), Number(month), currency, rates)))
      .then((rep) => {
        setReport(rep);
        setMsg({ type: "success", text: "Report loaded." });
      })
      .catch((err) => {
        setMsg({ type: "error", text: err?.message || "Failed to load report." });
      });
  }

  // Render the report page with filters and cost table
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Monthly Report
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center" }}>
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
            Total: <b>{report.total.total}</b> {report.total.currency}
          </Typography>

          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>Day</Box>
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>Sum</Box>
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>Currency</Box>
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>Category</Box>
                <Box component="th" sx={{ textAlign: "left", borderBottom: "1px solid #ddd", p: 1 }}>Description</Box>
              </Box>
            </Box>

            <Box component="tbody">
              {report.costs.map((c, idx) => (
                <Box component="tr" key={idx}>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>{c.Date?.day ?? ""}</Box>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>{c.sum}</Box>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>{c.currency}</Box>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>{c.category}</Box>
                  <Box component="td" sx={{ borderBottom: "1px solid #eee", p: 1 }}>{c.description}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
