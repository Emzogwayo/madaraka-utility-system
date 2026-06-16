// 1. IMPORTS
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// We need these Firebase tools to check who is logged in and to log them out
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { 
  LogOut, 
  PlusCircle, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Droplet, 
  Zap, 
  Trash2,
  AlertCircle
} from "lucide-react";

export default function ResidentDashboard() {
  // 2. STATE MANAGEMENT
  // 'user' will hold the details of the currently logged-in resident
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 3. SECURITY: PROTECTED ROUTE LOGIC
  // useEffect runs automatically as soon as this page loads.
  useEffect(() => {
    // onAuthStateChanged constantly listens to Firebase to see if someone is logged in
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // If someone is logged in, save their data to our 'user' state
        setUser(currentUser);
      } else {
        // SECURITY FEATURE: If no one is logged in, kick them back to the login page!
        navigate("/login");
      }
    });

    // Cleanup function when the component unmounts
    return () => unsubscribe();
  }, [navigate]);

  // 4. LOGOUT FUNCTION
  const handleLogout = async () => {
    try {
      await signOut(auth); // Tells Firebase to end the session
      navigate("/");       // Sends the user back to the Landing Page
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // 5. DUMMY DATA FOR PRESENTATION
  // We will replace this with real Firestore data next week (Phase 2 of your timeline)
  const recentReports = [
    {
      id: "TKT-001",
      category: "Water Services",
      icon: Droplet,
      desc: "Burst pipe near Block B parking lot.",
      status: "Pending",
      date: "Oct 24, 2026",
      color: "text-sky-500",
      bg: "bg-sky-100"
    },
    {
      id: "TKT-002",
      category: "Electricity Services",
      icon: Zap,
      desc: "Streetlight flickering continuously.",
      status: "In Progress",
      date: "Oct 22, 2026",
      color: "text-amber-500",
      bg: "bg-amber-100"
    },
    {
      id: "TKT-003",
      category: "Waste Management",
      icon: Trash2,
      desc: "Bins uncollected for 3 days.",
      status: "Resolved",
      date: "Oct 18, 2026",
      color: "text-emerald-500",
      bg: "bg-emerald-100"
    }
  ];

  // Helper function to color-code the status badges
  const getStatusBadge = (status) => {
    if (status === "Pending") return "bg-red-100 text-red-700";
    if (status === "In Progress") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  // 6. UI RENDER
  // If 'user' is null (still loading), show a blank screen to prevent flashing
  if (!user) return null; 

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Madaraka <span className="text-blue-600">Connect</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-semibold transition-colors">
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-medium transition-colors">
            <FileText className="h-5 w-5" />
            My Reports
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-medium transition-colors">
            <Settings className="h-5 w-5" />
            Settings
          </button>
        </nav>

        {/* User Profile & Logout at bottom of sidebar */}
        <div className="p-4 border-t border-slate-200">
          <div className="mb-4 px-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Logged in as</p>
            {/* Dynamically displays the email of the logged-in user! */}
            <p className="text-sm font-bold truncate">{user.email}</p> 
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-6 lg:p-10">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Resident Dashboard</h2>
            <p className="text-slate-500 mt-1">Manage and track your utility reports.</p>
          </div>
          {/* This button will open the report form next week! */}
          <button className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-blue-600/20 transition-all">
            <PlusCircle className="h-5 w-5" />
            Report New Fault
          </button>
        </div>

        {/* Dashboard Cards / Overview */}
        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <span className="text-slate-500 font-medium text-sm">Total Reports</span>
            <span className="text-3xl font-extrabold mt-2">3</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <span className="text-slate-500 font-medium text-sm">In Progress</span>
            <span className="text-3xl font-extrabold mt-2 text-amber-600">1</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <span className="text-slate-500 font-medium text-sm">Resolved</span>
            <span className="text-3xl font-extrabold mt-2 text-emerald-600">1</span>
          </div>
        </div>

        {/* Recent Reports List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-bold">Recent Reports</h3>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-800">View All</button>
          </div>
          
          <div className="divide-y divide-slate-100">
            {/* Map through our dummy data array to create the list */}
            {recentReports.map((report) => {
              const Icon = report.icon;
              return (
                <div key={report.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${report.bg} ${report.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{report.category}</p>
                      <p className="text-sm text-slate-500 mt-1">{report.desc}</p>
                      <div className="flex items-center gap-2 mt-2 sm:hidden">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(report.status)}`}>
                          {report.status}
                        </span>
                        <span className="text-xs font-medium text-slate-400">• {report.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="text-sm font-medium text-slate-400">{report.date}</span>
                    <span className="text-xs font-bold text-slate-300">{report.id}</span>
                  </div>

                </div>
              );
            })}
          </div>
          
          {/* Footer of the list */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center sm:text-left">
            <p className="text-xs text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1">
              <AlertCircle className="h-4 w-4" />
              Real-time synchronization active
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}