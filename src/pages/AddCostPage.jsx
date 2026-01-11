import { useMemo, useState } from "react";
import { openCostsDB } from "../idb/idb.js";

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

const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];

const CATEGORIES = [
  "Food",
  "Car",
  "Education",
  "Health",
  "Housing",
  "Leisure",
  "Other",
];

export default function AddCostPage() {
  const [sum, setSum] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState(null);

  const errors = useMemo(() => {
    const e = {};
    const n = Number(sum);

    if (sum === "") e.sum = "Required";
    else if (Number.isNaN(n)) e.sum = "Must be a number";
    else if (n <= 0) e.sum = "Must be > 0";

    if (!currency) e.currency = "Required";
    if (!category) e.category = "Required";

    if (!description.trim()) e.description = "Required";
    else if (description.trim().length < 2) e.description = "Too short";

    return e;
  }, [sum, currency, category, description]);

  const isValid = Object.keys(errors).length === 0;

  function onClear() {
    setSum("");
    setCurrency("USD");
    setCategory("Food");
    setDescription("");
    // בכוונה לא מוחקים msg כדי לראות הודעת הצלחה/שגיאה
  }

  function onSubmit(e) {
    e.preventDefault();
    console.log("SUBMIT CLICKED");
    setMsg(null);

    if (!isValid) {
      console.log("FORM INVALID", errors);
      setMsg({ type: "error", text: "Fix the form errors first." });
      return;
    }

    const payload = {
      sum: Number(sum),
      currency,
      category,
      description: description.trim(),
    };

    console.log("PAYLOAD", payload);

    openCostsDB("costsdb", 1)
      .then((db) => {
        console.log("DB OPENED", db);
        return db.addCost(payload);
      })
      .then((saved) => {
        console.log("SAVED", saved);
        setMsg({ type: "success", text: "Cost item saved." });
        onClear();
      })
      .catch((err) => {
        console.error("SAVE FAILED", err);
        setMsg({
          type: "error",
          text: err?.message ? err.message : "Failed to save cost item.",
        });
      });
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Add Cost Item
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2 }}>
          <TextField
            label="Sum"
            value={sum}
            onChange={(e) => setSum(e.target.value)}
            error={Boolean(errors.sum)}
            helperText={errors.sum || " "}
            inputProps={{ inputMode: "decimal" }}
            required
          />

          <FormControl error={Boolean(errors.currency)} required>
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

          <FormControl error={Boolean(errors.category)} required>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={Boolean(errors.description)}
            helperText={errors.description || " "}
            required
          />

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" type="submit" disabled={!isValid}>
              Add
            </Button>
            <Button variant="outlined" type="button" onClick={onClear}>
              Clear
            </Button>
          </Box>

          {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
        </Box>
      </Paper>
    </Box>
  );
}
