import { Link, Route, Routes } from "react-router-dom";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import AddCostPage from "../pages/AddCostPage.jsx";
import ReportPage from "../pages/ReportPage.jsx";
import PieChartPage from "../pages/PieChartPage.jsx";
import BarChartPage from "../pages/BarChartPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";

export default function App() {
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography sx={{ flexGrow: 1 }} variant="h6">
            Cost Manager
          </Typography>

          <Button color="inherit" component={Link} to="/">Add</Button>
          <Button color="inherit" component={Link} to="/report">Report</Button>
          <Button color="inherit" component={Link} to="/pie">Pie</Button>
          <Button color="inherit" component={Link} to="/bar">Bar</Button>
          <Button color="inherit" component={Link} to="/settings">Settings</Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<AddCostPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/pie" element={<PieChartPage />} />
          <Route path="/bar" element={<BarChartPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Container>
    </Box>
  );
}
