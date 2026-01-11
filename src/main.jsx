import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import App from "./app/App.jsx";
import { theme } from "./app/theme.js";

/**
 * Application Entry Point
 * Initializes React application with routing, theme, and Material-UI setup
 * Renders the main App component into the root DOM element
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Material-UI theme provider for consistent styling */}
    <ThemeProvider theme={theme}>
      {/* CssBaseline provides consistent CSS reset */}
      <CssBaseline />
      {/* BrowserRouter enables client-side routing */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
