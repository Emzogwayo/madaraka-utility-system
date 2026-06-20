import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ResidentDashboard from "./pages/ResidentDashboard";
import DispatcherDashboard from "./pages/DispatcherDashboard";
import ReportForm from "./pages/ReportForm";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Route (Resident) */}
        <Route path="/dashboard" element={<ResidentDashboard />} />
        {/* Protected Route (Report Form) */}
        <Route path="/report" element={<ReportForm />} />
        {/* Protected Route (Dispatcher) */}
        <Route path="/dispatcher-dashboard" element={<DispatcherDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;