import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
// --- NEW: Added XCircle icon for the "No" button ---
import { 
  LogOut, PlusCircle, LayoutDashboard, FileText, Settings, 
  Droplet, Zap, Trash2, AlertCircle, Loader2, User, Phone, CheckCircle, XCircle
} from "lucide-react";

export default function ResidentDashboard() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  
  const navigate = useNavigate();

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

  const handleConfirmResolution = async (ticketId) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { status: "Closed" });
    } catch (error) {
      console.error("Error confirming resolution: ", error);
      alert("Failed to confirm resolution.");
    }
  };

  // --- NEW: Function to handle a rejected resolution ---
  const handleRejectResolution = async (ticketId) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      // If the resident says no, kick the ticket back to Pending so the dispatcher has to handle it again
      await updateDoc(ticketRef, { status: "Pending" });
    } catch (error) {
      console.error("Error rejecting resolution: ", error);
      alert("Failed to reject resolution.");
    }
  };

  const getStatusBadge = (status) => {
    if (status === "Pending") return "bg-yellow-100 text-yellow-700";
    if (status === "Dispatched") return "bg-blue-100 text-blue-700";
    if (status === "Resolved") return "bg-emerald-100 text-emerald-700";
    if (status === "Closed") return "bg-slate-200 text-slate-700";
    return "bg-slate-100 text-slate-700";
  };

  const getCategoryStyles = (category) => {
    if (category === "Water Services") return { icon: Droplet, color: "text-sky-500", bg: "bg-sky-100" };
    if (category === "Electricity Services") return { icon: Zap, color: "text-amber-500", bg: "bg-amber-100" };
    if (category === "Waste Management") return { icon: Trash2, color: "text-emerald-500", bg: "bg-emerald-100" };
    return { icon: AlertCircle, color: "text-slate-500", bg: "bg-slate-100" };
  };

  if (!user) return null; 

  const totalReports = reports.length;
  const inProgressReports = reports.filter(r => r.status === "Dispatched").length;
  const resolvedReports = reports.filter(r => r.status === "Resolved" || r.status === "Closed").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
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
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Resident Dashboard</h2>
            <p className="text-slate-500 mt-1">Manage and track your utility reports.</p>
          </div>
          <Link to="/report" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-blue-600/20 transition-all">
            <PlusCircle className="h-5 w-5" />
            Report New Fault
          </Link>
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

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-bold">Recent Reports</h3>
          </div>
          
          <div className="divide-y divide-slate-100">
            {loadingTickets ? (
              <div className="p-10 flex justify-center items-center text-slate-500 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Fetching your reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                You haven't reported any issues yet.
              </div>
            ) : (
              reports.map((report) => {
                const style = getCategoryStyles(report.category);
                const Icon = style.icon;
                const formattedDate = report.createdAt ? report.createdAt.toDate().toLocaleDateString() : 'Just now';

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

                        {/* --- NEW UI: YES/NO DECISION BUTTONS --- */}
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
                        
                        {report.status === "Closed" && (
                          <p className="mt-4 text-xs font-bold text-slate-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> You confirmed this issue was resolved.
                          </p>
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
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(report.status)}`}>
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

      </main>
    </div>
  );
}