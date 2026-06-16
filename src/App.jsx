import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ResidentDashboard from "./pages/ResidentDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Route (Resident) */}
        <Route path="/dashboard" element={<ResidentDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;