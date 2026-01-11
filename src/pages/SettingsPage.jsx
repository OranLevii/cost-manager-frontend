import { useEffect, useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { getSettings, saveSettings } from "../services/settingsService.js";
import { fetchRates } from "../services/ratesService.js";

/**
 * SettingsPage Component
 * Allows users to configure application settings
 * Currently supports setting the exchange rates URL
 * Includes a test function to verify the URL works
 */
export default function SettingsPage() {
  const [ratesUrl, setRatesUrl] = useState("");
  const [msg, setMsg] = useState(null);

  /**
   * Loads settings from storage when component mounts
   */
  useEffect(() => {
    const s = getSettings();
    setRatesUrl(s.ratesUrl);
  }, []);

  /**
   * Saves the current settings to localStorage
   */
  function onSave() {
    saveSettings({ ratesUrl });
    setMsg({ type: "success", text: "Saved" });
  }

  /**
   * Tests the exchange rates URL by attempting to fetch rates
   * Displays success message with available currencies or error message
   */
  function onTest() {
    setMsg(null);
    fetchRates()
      .then((rates) => {
        setMsg({ type: "success", text: "OK: " + Object.keys(rates).join(", ") });
      })
      .catch((e) => {
        setMsg({ type: "error", text: e?.message || "Error" });
      });
  }

  // Render the settings page with URL input and action buttons
  return (
    <Box sx={{ maxWidth: 750 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Settings
      </Typography>

      <TextField
        fullWidth
        label="Exchange Rates URL"
        value={ratesUrl}
        onChange={(e) => setRatesUrl(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="contained" onClick={onSave}>
          Save
        </Button>
        <Button variant="outlined" onClick={onTest}>
          Test URL
        </Button>
      </Box>

      {msg && (
        <Alert sx={{ mt: 2 }} severity={msg.type}>
          {msg.text}
        </Alert>
      )}
    </Box>
  );
}
