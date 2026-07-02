// ==========================================
// 1. IMPORTS
// ==========================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";

import { 
  Clock, CheckCircle, Truck, Loader2, LayoutDashboard, FileText, 
  LogOut, User, Phone, MapPin, AlertTriangle, BarChart2, HelpCircle, Star, X 
} from "lucide-react";

import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';

export default function DispatcherDashboard() {
  // ==========================================
  // 2. STATE MANAGEMENT
  // ==========================================
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatcherDept, setDispatcherDept] = useState(""); 
  const [agencyName, setAgencyName] = useState(""); 

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active"); 

  const [assigningId, setAssigningId] = useState(null);
  const [techName, setTechName] = useState("");
  const [techContact, setTechContact] = useState("");

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  // ==========================================
  // 3. LIFECYCLE & DATA FETCHING
  // ==========================================
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setDispatcherDept(data.department); 
            setAgencyName(data.agencyName || currentUser.email); 

            const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
            
            const unsubscribeTickets = onSnapshot(q, (snapshot) => {
              let fetchedTickets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              fetchedTickets = fetchedTickets.filter(ticket => ticket.category === data.department);

              // --- UPDATED: Keep BOTH Escalated and Admin_Reviewed at the absolute top ---
              fetchedTickets.sort((a, b) => {
                const aUrgent = a.status === "Escalated" || a.status === "Admin_Reviewed";
                const bUrgent = b.status === "Escalated" || b.status === "Admin_Reviewed";
                if (aUrgent && !bUrgent) return -1;
                if (bUrgent && !aUrgent) return 1;
                return 0; 
              });

              setTickets(fetchedTickets);
              setLoading(false);
            }, (error) => {
              console.error("Error fetching tickets: ", error);
              setLoading(false);
            });

            return () => unsubscribeTickets();
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setLoading(false);
        }

      } else {
        navigate("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // ==========================================
  // 4. ACTION HANDLERS
  // ==========================================
  const handleStatusChange = async (ticket, newStatus) => {
    try {
      const ticketRef = doc(db, "tickets", ticket.id);
      await updateDoc(ticketRef, { status: newStatus });

      await addDoc(collection(db, "audit_logs"), {
        ticketId: ticket.id,
        action: "Status Update",
        details: `Changed status to ${newStatus}`,
        performedBy: agencyName || auth.currentUser?.email || "Unknown Dispatcher",
        timestamp: serverTimestamp()
      });
      toast.success(`Status updated to ${newStatus}`);

      if (newStatus === "Resolved" && ticket.residentId) {
        await addDoc(collection(db, "notifications"), {
          recipientId: ticket.residentId,
          title: "Issue Resolved",
          message: `Your ${ticket.category} ticket has been marked as resolved. Please confirm in your dashboard.`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error("Error updating status: ", error);
      toast.error("Failed to update status. Please try again.");
    }
  };

  const openAssignForm = (ticket) => {
    setAssigningId(ticket.id);
    setTechName(ticket.technicianName || "");
    setTechContact(ticket.technicianContact || "");
  };

  const handleAssignTechnician = async (ticket) => {
    const nameParts = techName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      toast.error("Validation Error: Please provide both the First and Last name of the technician.");
      return;
    }

    const phoneRegex = /^(\+254|0)\d{9}$/;
    if (!phoneRegex.test(techContact.trim())) {
      toast.error("Validation Error: Phone number must be in a valid Kenyan format (e.g., 07XXXXXXXX).");
      return;
    }

    try {
      const ticketRef = doc(db, "tickets", ticket.id);
      await updateDoc(ticketRef, { 
        status: "Dispatched",
        technicianName: techName.trim(),
        technicianContact: techContact.trim()
      });
      
      await addDoc(collection(db, "audit_logs"), {
        ticketId: ticket.id,
        action: "Technician Assignment",
        details: `Assigned technician ${techName.trim()} (${techContact.trim()})`,
        performedBy: agencyName || auth.currentUser?.email || "Unknown Dispatcher",
        timestamp: serverTimestamp()
      });

      if (ticket.residentId) {
        await addDoc(collection(db, "notifications"), {
          recipientId: ticket.residentId,
          title: "Technician Dispatched",
          message: `${techName.trim()} has been assigned to your ${ticket.category} issue.`,
          read: false,
          createdAt: serverTimestamp()
        });
      }
      
      setAssigningId(null);
      setTechName("");
      setTechContact("");
      toast.success("Technician dispatched successfully!");
    } catch (error) {
      console.error("Error assigning technician: ", error);
      toast.error("Failed to assign technician.");
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
      window.scrollTo(0, 0); 
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleSendSupportMessage = async (e) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setIsSendingSupport(true);
    try {
      await addDoc(collection(db, "notifications"), {
        recipientId: "admin",
        title: `Support Request from ${agencyName || dispatcherDept}`,
        message: supportMessage.trim(),
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
  // 5. UI HELPERS & DERIVED STATE
  // ==========================================
  const getStatusColor = (status) => {
    switch(status) {
      case "Pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Dispatched": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Resolved": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Closed": return "bg-slate-200 text-slate-600 border-slate-300"; 
      case "Cancelled": return "bg-red-50 text-red-500 border-red-200"; 
      case "Escalated": return "bg-red-100 text-red-800 border-red-300"; 
      // --- UPDATED: Admin_Reviewed is now explicitly RED and urgent ---
      case "Admin_Reviewed": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const totalReports = tickets.length;
  const pendingReports = tickets.filter(t => t.status === "Pending" || t.status === "Escalated" || t.status === "Admin_Reviewed").length;  
  const dispatchedReports = tickets.filter(t => t.status === "Dispatched").length;

  const displayedTickets = activeTab === "active" 
    ? tickets.filter(t => t.status !== "Closed" && t.status !== "Cancelled") 
    : tickets;

  const ratedTickets = tickets.filter(t => t.rating && t.rating > 0);
  const averageRating = ratedTickets.length > 0 
    ? (ratedTickets.reduce((acc, curr) => acc + curr.rating, 0) / ratedTickets.length).toFixed(1) 
    : "0.0";
  
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratedTickets.forEach(t => {
    ratingCounts[t.rating] = (ratingCounts[t.rating] || 0) + 1;
  });

  // ==========================================
  // 6. RENDER
  // ==========================================
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* --- NEW FLOATING MODAL: SUPPORT --- */}
      {isSupportModalOpen && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
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

      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex z-20">
        <div>
          <div className="p-6 md:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Madaraka <span className="text-blue-600">Connect</span>
            </h1>
          </div>
          
          <nav className="px-4 space-y-2">
            <button 
              onClick={() => setActiveTab("active")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                activeTab === "active" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab("all")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                activeTab === "all" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <FileText className="w-5 h-5 shrink-0" /> All Records
            </button>
            
            <button 
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                activeTab === "analytics" ? "bg-amber-50 text-amber-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <BarChart2 className="w-5 h-5 shrink-0" /> 
              <span className="whitespace-nowrap">Performance Analytics</span>
            </button>

            <button 
              onClick={() => setIsSupportModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 mt-4 border-t border-slate-100 rounded-xl font-semibold transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <HelpCircle className="w-5 h-5 shrink-0" /> 
              <span className="whitespace-nowrap">Help & Support</span>
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Logged in as</p>
          <p className="text-sm font-bold text-slate-900 truncate">{agencyName}</p>
          <p className="text-xs text-blue-600 font-bold mb-4">{dispatcherDept}</p>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors">
            <LogOut className="w-5 h-5" /> Log Out
          </button>
        </div>
      </aside>

      {/* --- RIGHT SIDE WRAPPER --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* --- FIXED HEADER --- */}
        <header className="bg-white border-b border-slate-200 px-6 md:px-10 py-4 flex items-center justify-between shadow-sm shrink-0 z-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {activeTab === "active" ? "Dispatcher Dashboard" : 
             activeTab === "all" ? "All Records" : "Performance Analytics"}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">Dept Alerts</span>
            <NotificationBell recipientId={`dispatcher_${dispatcherDept}`} />
          </div>
        </header>
        
        {/* --- SCROLLABLE MAIN CONTENT --- */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 relative">
          
          {/* ========================================== */}
          {/* VIEW 1: ACTIVE OR ALL TICKETS LOGIC */}
          {/* ========================================== */}
          {(activeTab === "active" || activeTab === "all") && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 mb-2">Total Reports</p>
                  <p className="text-4xl font-extrabold text-slate-900">{totalReports}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 mb-2">Pending Action</p>
                  <p className="text-4xl font-extrabold text-amber-500">{pendingReports}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 mb-2">Dispatched</p>
                  <p className="text-4xl font-extrabold text-blue-600">{dispatchedReports}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeTab === "active" ? "Active Issues" : "All Records"}
                  </h3>
                </div>

                <div className="p-6">
                  {loading ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : displayedTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                      <p className="text-slate-500">
                        {activeTab === "active" ? `No active tickets for ${dispatcherDept}.` : `No records found for ${dispatcherDept}.`}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {displayedTickets.map((ticket) => {
                        
                        // --- UPDATED: Consolidated urgent logic ---
                        const isUrgent = ticket.status === "Escalated" || ticket.status === "Admin_Reviewed";

                        const isPendingDisabled = 
                          ticket.status === "Dispatched" || 
                          ticket.status === "Resolved" || 
                          ticket.status === "Closed" || 
                          ticket.status === "Cancelled" || 
                          ticket.status === "Admin_Reviewed" ||
                          ticket.technicianName;

                        const isAssignDisabled = 
                          ticket.status === "Resolved" || 
                          ticket.status === "Closed" || 
                          ticket.status === "Cancelled";

                        const isResolveDisabled = 
                          ticket.status === "Resolved" || 
                          ticket.status === "Closed" || 
                          ticket.status === "Cancelled" || 
                          !ticket.technicianName;

                        return (
                          <div key={ticket.id} className={`bg-slate-50 rounded-xl border flex flex-col overflow-hidden transition-all hover:shadow-md ${
                            ticket.status === 'Cancelled' ? 'border-red-100 opacity-75' : 
                            isUrgent ? 'border-2 border-red-600 shadow-red-500/20' : 
                            'border-slate-200 hover:border-blue-200'
                          }`}>
                            
                            {/* --- UPDATED: Red Banner explicitly handles Admin Ping --- */}
                            {isUrgent && (
                              <div className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 flex items-center justify-between shadow-sm">
                                <span className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" /> 
                                  {ticket.status === "Admin_Reviewed" ? "Admin Pinged: Resolve Immediately" : "Priority Escalation"}
                                </span>
                                <span>{ticket.status === "Admin_Reviewed" ? "Admin Escalated" : "Admin Notified"}</span>
                              </div>
                            )}

                            <div className="p-5 border-b border-slate-200 bg-white">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-900">{ticket.category}</span>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getStatusColor(ticket.status)}`}>
                                  {ticket.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">Reported by: <span className="font-medium text-slate-700">{ticket.residentEmail}</span></p>
                            </div>

                            <div className="p-5 flex-grow">
                              <p className="text-sm text-slate-700">{ticket.description}</p>
                              
                              {(ticket.imageUrl || ticket.location) && (
                                <div className="mt-4 flex flex-col gap-3">
                                  {ticket.imageUrl && (
                                    <div className="relative h-48 rounded-xl overflow-hidden border border-slate-200 bg-white">
                                      <img src={ticket.imageUrl} alt="Fault Evidence" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                    </div>
                                  )}
                                  
                                  {ticket.location && (
                                    <a 
                                      href={`https://www.google.com/maps/search/?api=1&query=${ticket.location.lat},${ticket.location.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-sm"
                                    >
                                      <MapPin className="w-4 h-4" /> Open Exact Location in Google Maps
                                    </a>
                                  )}
                                </div>
                              )}
                              
                              {ticket.technicianName && (
                                <div className="mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-1">
                                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Assigned Technician</span>
                                  <div className="flex items-center gap-4 text-sm text-blue-900">
                                    <span className="flex items-center gap-1"><User className="w-4 h-4" /> {ticket.technicianName}</span>
                                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {ticket.technicianContact}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-white">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Update Status</label>
                              
                              {assigningId === ticket.id ? (
                                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      placeholder="Tech Name (e.g., John Doe)" 
                                      value={techName}
                                      onChange={(e) => setTechName(e.target.value)}
                                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <input 
                                      type="text" 
                                      placeholder="07XXXXXXXX" 
                                      value={techContact}
                                      onChange={(e) => setTechContact(e.target.value)}
                                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleAssignTechnician(ticket)} 
                                      className="flex-1 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                      Confirm
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setAssigningId(null);
                                        setTechName("");
                                        setTechContact("");
                                      }}
                                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  
                                  <button 
                                    onClick={() => handleStatusChange(ticket.id, "Pending")}
                                    disabled={isPendingDisabled}
                                    className={`flex-1 py-2 border rounded-lg text-xs font-semibold transition-colors flex justify-center items-center gap-1 
                                      ${isPendingDisabled 
                                        ? "border-slate-200 text-slate-400 bg-slate-100/50 cursor-not-allowed" 
                                        : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}
                                  >
                                    <Clock className="h-3 w-3" /> Pending
                                  </button>
                                  
                                  <button 
                                    onClick={() => openAssignForm(ticket)}
                                    disabled={isAssignDisabled}
                                    className={`flex-1 py-2 border rounded-lg text-xs font-semibold transition-colors flex justify-center items-center gap-1 
                                      ${isAssignDisabled 
                                        ? "border-slate-200 text-slate-400 bg-slate-100/50 cursor-not-allowed" 
                                        : "border-blue-200 hover:bg-blue-50 text-blue-700"}`}
                                  >
                                    <Truck className="w-3 h-3" /> 
                                    {ticket.technicianName ? "Reassign" : "Assign"}
                                  </button>
                                  
                                  <button onClick={() => handleStatusChange(ticket, "Resolved")} 
                                    disabled={isResolveDisabled}
                                    className={`flex-1 py-2 border rounded-lg text-xs font-semibold transition-colors flex justify-center items-center gap-1 
                                      ${isResolveDisabled 
                                        ? "border-slate-200 text-slate-400 bg-slate-100/50 cursor-not-allowed" 
                                        : "border-emerald-200 hover:bg-emerald-50 text-emerald-700"}`}
                                  >
                                    <CheckCircle className="h-3 w-3" /> Resolve
                                  </button>

                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 2: UPDATED ANALYTICS TAB */}
          {/* ========================================== */}
          {activeTab === "analytics" && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
                <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Performance Overview</h3>
                
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex flex-col items-center justify-center p-8 bg-amber-50 rounded-3xl border border-amber-100 min-w-[240px]">
                    <p className="text-6xl font-extrabold text-amber-600 mb-4">{averageRating}</p>
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={`w-6 h-6 ${star <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Average Rating</p>
                    <p className="text-sm font-medium text-amber-600 mt-2">Based on {ratedTickets.length} reviews</p>
                  </div>
                  
                  <div className="flex-1 w-full space-y-4 pr-4">
                    <h4 className="font-bold text-slate-900 mb-2">Rating Breakdown</h4>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = ratingCounts[star];
                      const percentage = ratedTickets.length > 0 ? (count / ratedTickets.length) * 100 : 0;
                      
                      return (
                        <div key={star} className="flex items-center gap-4 text-sm">
                          <div className="flex items-center justify-end gap-1 w-10 text-slate-600 font-bold">
                            {star} <Star className="w-3.5 h-3.5 fill-slate-400 text-slate-400" />
                          </div>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="w-8 text-right text-slate-500 font-bold">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4 mt-6">
                <CheckCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900 font-medium">
                  Ratings are collected anonymously when a resident confirms a ticket has been successfully resolved. High ratings ensure prompt and effective community management.
                </p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}