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

// Supported currency codes for cost items
const CURRENCIES = ["USD", "ILS", "GBP", "EURO"];

// Available cost categories
const CATEGORIES = [
  "Food",
  "Car",
  "Education",
  "Health",
  "Housing",
  "Leisure",
  "Other",
];

/**
 * AddCostPage Component
 * Form for adding new cost items to the database
 * Includes validation and error handling
 */
export default function AddCostPage() {
  const [sum, setSum] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState(null);

  /**
   * Validates form inputs and returns error messages
   * Recalculates whenever form values change
   */
  const errors = useMemo(() => {
    const e = {};
    const n = Number(sum);

    // Validate sum: must be provided, numeric, and positive
    if (sum === "") e.sum = "Required";
    else if (Number.isNaN(n)) e.sum = "Must be a number";
    else if (n <= 0) e.sum = "Must be > 0";

    // Validate currency and category: must be selected
    if (!currency) e.currency = "Required";
    if (!category) e.category = "Required";

    // Validate description: must be provided and at least 2 characters
    if (!description.trim()) e.description = "Required";
    else if (description.trim().length < 2) e.description = "Too short";

    return e;
  }, [sum, currency, category, description]);

  // Check if form is valid (no errors)
  const isValid = Object.keys(errors).length === 0;

  /**
   * Clears all form fields and resets to default values
   * Intentionally keeps msg to show success/error messages
   */
  function onClear() {
    setSum("");
    setCurrency("USD");
    setCategory("Food");
    setDescription("");
    // Intentionally don't clear msg to show success/error messages
  }

  /**
   * Handles form submission
   * Validates form, opens database, and saves the cost item
   * @param {Event} e - Form submit event
   */
  function onSubmit(e) {
    e.preventDefault();
    console.log("SUBMIT CLICKED");
    setMsg(null);

    // Validate form before submission
    if (!isValid) {
      console.log("FORM INVALID", errors);
      setMsg({ type: "error", text: "Fix the form errors first." });
      return;
    }

    // Prepare cost data for saving
    const payload = {
      sum: Number(sum),
      currency,
      category,
      description: description.trim(),
    };

    console.log("PAYLOAD", payload);

    // Open database and save the cost item
    openCostsDB("costsdb", 1)
      .then((db) => {
        console.log("DB OPENED", db);
        return db.addCost(payload);
      })
      .then((saved) => {
        console.log("SAVED", saved);
        setMsg({ type: "success", text: "Cost item saved." });
        // Clear form after successful save
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

  // Render the add cost form with validation and error messages
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
