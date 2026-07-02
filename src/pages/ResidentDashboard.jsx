// ==========================================
// 1. IMPORTS: Core React and Routing
// ==========================================
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

// FIREBASE: Authentication and Database functions
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

// UI ICONS: Lucide-react for scalable vector graphics
import { 
  LogOut, PlusCircle, LayoutDashboard, FileText, Settings, 
  Droplet, Zap, Trash2, AlertCircle, Loader2, User, Phone, CheckCircle, XCircle, AlertTriangle, Clock, ArrowRight, HelpCircle, Star, X 
} from "lucide-react";

import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';

export default function ResidentDashboard() {
  // ==========================================
  // 2. STATE MANAGEMENT (The Component's Memory)
  // ==========================================
  const [user, setUser] = useState(null); 
  const [reports, setReports] = useState([]); 
  const [loadingTickets, setLoadingTickets] = useState(true); 
  
  const [activeTab, setActiveTab] = useState("dashboard"); 
  const navigate = useNavigate();

  const [tempRatings, setTempRatings] = useState({});
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

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
      window.scrollTo(0, 0); 
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // ==========================================
  // 4. ACTION HANDLERS
  // ==========================================
  const handleConfirmResolution = async (ticket) => {
    try {
      const ticketRef = doc(db, "tickets", ticket.id);
      await updateDoc(ticketRef, { status: "Closed" });

      await addDoc(collection(db, "notifications"), {
        recipientId: `dispatcher_${ticket.category}`, 
        title: "Ticket Closed",
        message: `The resident confirmed that the ${ticket.category} issue is fully resolved.`,
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success("Resolution confirmed. Thank you!");
    } catch (error) {
      console.error("Error confirming resolution: ", error);
      toast.error("Failed to confirm resolution.");
    }
  };

  const handleRejectResolution = async (ticketId) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { status: "Pending" });
      toast.success("Ticket reopened and sent back to dispatchers.");
    } catch (error) {
      console.error("Error rejecting resolution: ", error);
      toast.error("Failed to reject resolution.");
    }
  };

  const handleEscalateTicket = async (ticket) => {
    try {
      const ticketRef = doc(db, "tickets", ticket.id);
      await updateDoc(ticketRef, { 
        status: "Escalated",
        escalatedAt: serverTimestamp() 
      });
      
      toast.success("Ticket escalated! Admin and Dispatcher have been notified.");
      
      await addDoc(collection(db, "notifications"), {
        recipientId: "admin", 
        title: "New Escalation",
        message: `A ${ticket.category} ticket has been escalated by ${user.email}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: `dispatcher_${ticket.category}`, 
        title: "Priority Escalation",
        message: `A resident escalated a ${ticket.category} ticket. The System Admin has been notified.`,
        read: false,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Error escalating ticket: ", error);
      toast.error("Failed to escalate ticket.");
    }
  };

  const handleCancelReport = async (ticketId) => {
    const isConfirmed = window.confirm("Are you sure you want to cancel this report? It will remain in your records as cancelled.");
    if (isConfirmed) {
      try {
        const ticketRef = doc(db, "tickets", ticketId);
        await updateDoc(ticketRef, { status: "Cancelled" });
        toast.success("Report successfully cancelled.");
      } catch (error) {
        console.error("Error cancelling report: ", error);
        toast.error("Failed to cancel the report.");
      }
    }
  };

  const handleRateTicket = async (ticketId) => {
    const ratingValue = tempRatings[ticketId];
    if (!ratingValue) return;

    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { rating: ratingValue });
      toast.success("Thank you for your feedback!");
    } catch (error) {
      console.error("Error rating ticket:", error);
      toast.error("Failed to submit rating.");
    }
  };

  const handleSendSupportMessage = async (e) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setIsSendingSupport(true);
    try {
      await addDoc(collection(db, "notifications"), {
        recipientId: "admin",
        title: "Resident Support Request",
        message: `${user.email} asked: "${supportMessage.trim()}"`,
        read: false,
        createdAt: serverTimestamp()
      });
      
      setSupportSuccess(true);
      setTimeout(() => {
        setIsSupportModalOpen(false);
        setSupportMessage("");
        setSupportSuccess(false);
      }, 2000);

    } catch (error) {
      console.error("Error sending support message:", error);
      toast.error("Failed to send message.");
    } finally {
      setIsSendingSupport(false);
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
    if (status === "Cancelled") return "bg-red-50 text-red-500 border border-red-100"; 
    if (status === "Admin_Reviewed") return "bg-purple-100 text-purple-700 border border-purple-200";
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

  // ==========================================
  // 6. THE UI RENDER
  // ==========================================
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      
      {/* --- FLOATING MODAL: SUPPORT --- */}
      {isSupportModalOpen && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 fixed">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Contact Admin</h3>
              <button 
                onClick={() => { setIsSupportModalOpen(false); setSupportMessage(""); setSupportSuccess(false); }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {supportSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">Message Sent!</h4>
                <p className="text-sm text-slate-500">The Admin has been notified.</p>
              </div>
            ) : (
              <form onSubmit={handleSendSupportMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">How can we help?</label>
                  <textarea 
                    required 
                    value={supportMessage} 
                    onChange={e => setSupportMessage(e.target.value)} 
                    rows="4" 
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600" 
                    placeholder="Describe your issue or question here..." 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSendingSupport} 
                  className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isSendingSupport ? "Sending..." : "Send Message to Admin"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex z-20">
        <div>
          <div className="p-6 md:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Madaraka <span className="text-blue-600">Connect</span>
            </h1>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <button 
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "dashboard" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "reports" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <FileText className="h-5 w-5 shrink-0" /> My Reports
            </button>
            
            <button 
              onClick={() => setIsSupportModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 mt-4 border-t border-slate-100 rounded-xl font-medium transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <HelpCircle className="h-5 w-5 shrink-0" /> 
              <span className="whitespace-nowrap">Help & Support</span>
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Logged in as</p>
          <p className="text-sm font-bold truncate mb-4">{user.email}</p>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors"
          >
            <LogOut className="h-5 w-5" /> Log Out
          </button>
        </div>
      </aside>

      {/* --- RIGHT SIDE WRAPPER (Locks Header & Scrolling) --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* --- FIXED HEADER --- */}
        <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 flex items-center justify-between shadow-sm shrink-0 z-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {activeTab === "dashboard" ? "Resident Dashboard" : "My Reports"}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">My Alerts</span>
            <NotificationBell recipientId={user.uid} />
          </div>
        </header>
        
        {/* --- SCROLLABLE MAIN CONTENT --- */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          
          {/* ========================================== */}
          {/* TAB 1: DASHBOARD */}
          {/* ========================================== */}
          {activeTab === "dashboard" && (
            <div className="max-w-4xl mx-auto">
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
          {/* TAB 2: MY REPORTS */}
          {/* ========================================== */}
          {activeTab === "reports" && (
            <div className="max-w-5xl mx-auto">
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
                      
                      const isOverdue = hoursDifference >= 24 || (report.description && report.description.includes("DEMO"));

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
                              {(report.status === "Pending" || report.status === "Dispatched") && isOverdue && (
                                <div className="mt-4 w-full max-w-md">
                                  <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                                      <Clock className="w-4 h-4" /> Taking longer than usual.
                                    </p>
                                    <button
                                      onClick={() => handleEscalateTicket(report)}
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
                                    onClick={() => handleConfirmResolution(report)} 
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
                              
                              {/* UI STATE 3: CLOSED TICKET ACKNOWLEDGMENT & 5-STAR RATING */}
                              {report.status === "Closed" && (
                                <div className="mt-4 flex flex-col gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" /> You confirmed this issue was resolved.
                                    </p>
                                    {/* --- UPDATED: Subtle rating display if already rated --- */}
                                    {report.rating && (
                                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        You rated this {report.rating} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* If NOT rated: Show clickable stars and a Submit button */}
                                  {!report.rating && (
                                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 inline-block w-fit">
                                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">Rate the Technician</p>
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => {
                                            const currentSelection = tempRatings[report.id] || 0;
                                            return (
                                              <button
                                                key={star}
                                                onClick={() => setTempRatings({ ...tempRatings, [report.id]: star })}
                                                className={`transition-colors focus:outline-none ${star <= currentSelection ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                                              >
                                                <Star className={`w-6 h-6 ${star <= currentSelection ? 'fill-amber-400' : ''}`} />
                                              </button>
                                            );
                                          })}
                                        </div>
                                          
                                        {tempRatings[report.id] && (
                                          <button 
                                            onClick={() => handleRateTicket(report.id)}
                                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                                          >
                                            Submit
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* UI STATE 4: CANCEL BUTTON */}
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
    </div>
  );
}