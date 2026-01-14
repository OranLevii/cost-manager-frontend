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

  useEffect(() => {
    const s = getSettings();
    setRatesUrl(s.ratesUrl);
  }, []);

  function onSave() {
    saveSettings({ ratesUrl });
    setMsg({ type: "success", text: "Saved" });
  }

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
