// ==========================================
// 1. IMPORTS: Core React and Routing
// ==========================================
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

// FIREBASE: Authentication and Database functions
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

// UI ICONS: Lucide-react for scalable vector graphics
import { 
  LogOut, PlusCircle, LayoutDashboard, FileText, Settings, 
  Droplet, Zap, Trash2, AlertCircle, Loader2, User, Phone, CheckCircle, XCircle, AlertTriangle, Clock, ArrowRight 
} from "lucide-react";

export default function ResidentDashboard() {
  // ==========================================
  // 2. STATE MANAGEMENT (The Component's Memory)
  // ==========================================
  const [user, setUser] = useState(null); 
  const [reports, setReports] = useState([]); 
  const [loadingTickets, setLoadingTickets] = useState(true); 
  
  const [activeTab, setActiveTab] = useState("dashboard"); 
  const navigate = useNavigate();

  // ==========================================
  // 3. LIFECYCLE & REAL-TIME DATA FETCHING
  // ==========================================
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        const q = query(
          collection(db, "tickets"), 
          where("residentId", "==", currentUser.uid)
        );

        const unsubscribeTickets = onSnapshot(q, (snapshot) => {
          const fetchedReports = [];
          snapshot.forEach((doc) => {
            fetchedReports.push({ id: doc.id, ...doc.data() });
          });
          
          fetchedReports.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
            return dateB - dateA;
          });

          setReports(fetchedReports);
          setLoadingTickets(false);
        });

        return () => unsubscribeTickets();

      } else {
        navigate("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // ==========================================
  // 4. TICKET LIFECYCLE LOGIC (State Machine)
  // ==========================================

  const handleConfirmResolution = async (ticketId) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { status: "Closed" });
    } catch (error) {
      console.error("Error confirming resolution: ", error);
      alert("Failed to confirm resolution.");
    }
  };

  const handleRejectResolution = async (ticketId) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { status: "Pending" });
    } catch (error) {
      console.error("Error rejecting resolution: ", error);
      alert("Failed to reject resolution.");
    }
  };

  const handleEscalateTicket = async (ticketId) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { 
        status: "Escalated",
        escalatedAt: serverTimestamp() 
      });
      alert("Ticket escalated successfully! The System Administrator has been notified.");
    } catch (error) {
      console.error("Error escalating ticket: ", error);
      alert("Failed to escalate ticket.");
    }
  };

  // ENIOLA'S ADDITION: Function to Soft-Delete (Cancel) a report
  const handleCancelReport = async (ticketId) => {
    const isConfirmed = window.confirm("Are you sure you want to cancel this report? It will remain in your records as cancelled.");
    if (isConfirmed) {
      try {
        const ticketRef = doc(db, "tickets", ticketId);
        await updateDoc(ticketRef, { status: "Cancelled" });
      } catch (error) {
        console.error("Error cancelling report: ", error);
        alert("Failed to cancel the report.");
      }
    }
  };

  // ==========================================
  // 5. HELPER FUNCTIONS FOR UI STYLING
  // ==========================================
  const getStatusBadge = (status) => {
    if (status === "Pending") return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    if (status === "Dispatched") return "bg-blue-100 text-blue-700 border border-blue-200";
    if (status === "Resolved") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (status === "Closed") return "bg-slate-200 text-slate-700 border border-slate-300";
    if (status === "Escalated") return "bg-red-100 text-red-700 border border-red-200";
    if (status === "Cancelled") return "bg-red-50 text-red-500 border border-red-100"; // Eniola's Addition
    return "bg-slate-100 text-slate-700";
  };

  const getCategoryStyles = (category) => {
    if (category === "Water Services") return { icon: Droplet, color: "text-sky-500", bg: "bg-sky-100" };
    if (category === "Electricity Services") return { icon: Zap, color: "text-amber-500", bg: "bg-amber-100" };
    if (category === "Waste Management") return { icon: Trash2, color: "text-emerald-500", bg: "bg-emerald-100" };
    return { icon: AlertCircle, color: "text-slate-500", bg: "bg-slate-100" };
  };

  if (!user) return null; 

  // ==========================================
  // 6. ANALYTICS CALCULATIONS
  // ==========================================
  const totalReports = reports.length;
  const inProgressReports = reports.filter(r => r.status === "Dispatched").length;
  const resolvedReports = reports.filter(r => r.status === "Resolved" || r.status === "Closed").length;

  // ==========================================
  // 7. THE UI RENDER
  // ==========================================
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
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "dashboard" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <LayoutDashboard className="h-5 w-5" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "reports" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <FileText className="h-5 w-5" /> My Reports
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="mb-4 px-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Logged in as</p>
            <p className="text-sm font-bold truncate">{user.email}</p> 
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-colors"
          >
            <LogOut className="h-5 w-5" /> Log Out
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-6 lg:p-10">
        
        {/* ========================================== */}
        {/* TAB 1: DASHBOARD (Call to Action & Stats)  */}
        {/* ========================================== */}
        {activeTab === "dashboard" && (
          <div className="max-w-4xl">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight">Resident Dashboard</h2>
              <p className="text-slate-500 mt-1">Welcome back. How can we help you today?</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl border border-blue-500 p-8 sm:p-12 text-center shadow-2xl shadow-blue-900/20 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <AlertTriangle className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2">Experiencing an Issue?</h3>
                <p className="text-blue-100 mb-8 max-w-md mx-auto">Report water leaks, power outages, or waste management issues directly to the Madaraka dispatch team.</p>
                <Link to="/report" className="inline-flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-blue-700 px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all hover:-translate-y-1">
                  <PlusCircle className="h-6 w-6" /> Report New Fault
                </Link>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-slate-500 font-medium text-sm">Total Reports</span>
                <span className="text-3xl font-extrabold mt-2">{totalReports}</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-slate-500 font-medium text-sm">Dispatched</span>
                <span className="text-3xl font-extrabold mt-2 text-blue-600">{inProgressReports}</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-slate-500 font-medium text-sm">Resolved</span>
                <span className="text-3xl font-extrabold mt-2 text-emerald-600">{resolvedReports}</span>
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                <button 
                  onClick={() => setActiveTab("reports")}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {reports.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No recent activity.</div>
                  ) : (
                    reports.slice(0, 3).map((report) => {
                      const style = getCategoryStyles(report.category);
                      const Icon = style.icon;
                      const formattedDate = report.createdAt ? report.createdAt.toDate().toLocaleDateString() : 'Just now';
                      
                      return (
                        <div key={report.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl shrink-0 ${style.bg} ${style.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-900">{report.category}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-sm mt-0.5">{report.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(report.status)}`}>
                              {report.status}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">{formattedDate}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: MY REPORTS (Ticket Management)      */}
        {/* ========================================== */}
        {activeTab === "reports" && (
          <div className="max-w-5xl">
            <div className="mb-10">
              <h2 className="text-3xl font-extrabold tracking-tight">My Reports</h2>
              <p className="text-slate-500 mt-1">Track the status and escalate your utility reports.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {loadingTickets ? (
                  <div className="p-10 flex justify-center items-center text-slate-500 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Fetching your reports...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                    <CheckCircle className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600">You haven't reported any issues yet.</p>
                    <button onClick={() => setActiveTab("dashboard")} className="mt-4 text-blue-600 font-semibold hover:underline">Return to Dashboard</button>
                  </div>
                ) : (
                  reports.map((report) => {
                    const style = getCategoryStyles(report.category);
                    const Icon = style.icon;
                    const formattedDate = report.createdAt ? report.createdAt.toDate().toLocaleDateString() : 'Just now';

                    const now = new Date();
                    const ticketDate = report.createdAt ? report.createdAt.toDate() : now;
                    const hoursDifference = (now - ticketDate) / (1000 * 60 * 60);
                    // MUST REMAIN 48 FOR FINAL PRODUCTION
                    const isOverdue = hoursDifference > 48; 

                    return (
                      <div key={report.id} className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
                        
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-xl shrink-0 ${style.bg} ${style.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 w-full">
                            <p className="font-bold text-slate-900">{report.category}</p>
                            <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                            
                            {report.technicianName && (
                              <div className="mt-4 bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col gap-1 w-full max-w-md">
                                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Assigned Technician</span>
                                <div className="flex items-center gap-4 text-sm text-blue-900">
                                  <span className="flex items-center gap-1"><User className="w-4 h-4" /> {report.technicianName}</span>
                                  <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {report.technicianContact}</span>
                                </div>
                              </div>
                            )}

                            {/* UI STATE 1: OVERDUE ESCALATION BUTTON */}
                            {report.status === "Pending" && isOverdue && (
                              <div className="mt-4 w-full max-w-md">
                                <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> Taking longer than usual.
                                  </p>
                                  <button
                                    onClick={() => handleEscalateTicket(report.id)}
                                    className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-1 shrink-0"
                                  >
                                    <AlertTriangle className="w-4 h-4" /> Escalate
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* UI STATE 2: YES/NO RESOLUTION FEEDBACK LOOP */}
                            {report.status === "Resolved" && (
                              <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full max-w-md">
                                <button
                                  onClick={() => handleConfirmResolution(report.id)}
                                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4" /> Yes, it's fixed
                                </button>
                                <button
                                  onClick={() => handleRejectResolution(report.id)}
                                  className="flex-1 px-4 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                  <XCircle className="w-4 h-4" /> No, still broken
                                </button>
                              </div>
                            )}
                            
                            {/* UI STATE 3: CLOSED TICKET ACKNOWLEDGMENT */}
                            {report.status === "Closed" && (
                              <p className="mt-4 text-xs font-bold text-slate-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> You confirmed this issue was resolved.
                              </p>
                            )}

                            {/* UI STATE 4: ENIOLA'S CANCEL BUTTON */}
                            {report.status === "Pending" && (
                              <button
                                onClick={() => handleCancelReport(report.id)}
                                className="mt-4 text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" /> Cancel this report
                              </button>
                            )}

                            <div className="flex items-center gap-2 mt-4 sm:hidden">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(report.status)}`}>
                                {report.status}
                              </span>
                              <span className="text-xs font-medium text-slate-400">• {formattedDate}</span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(report.status)}`}>
                            {report.status}
                          </span>
                          <span className="text-sm font-medium text-slate-400">{formattedDate}</span>
                          <span className="text-xs font-bold text-slate-300">ID: {report.id.slice(0,6)}...</span>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}