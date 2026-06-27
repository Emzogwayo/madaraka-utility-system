import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
// --- NEW IMPORTS: Added addDoc and serverTimestamp to create background logs ---
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Clock, CheckCircle, Truck, Loader2, LayoutDashboard, FileText, LogOut, User, Phone, MapPin } from "lucide-react";

export default function DispatcherDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("active"); 

  const [assigningId, setAssigningId] = useState(null);
  const [techName, setTechName] = useState("");
  const [techContact, setTechContact] = useState("");

  useEffect(() => {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTickets(ticketsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tickets: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { status: newStatus });

      // --- NEW: Record a receipt in the audit_logs collection ---
      await addDoc(collection(db, "audit_logs"), {
        ticketId: ticketId,
        action: "Status Update",
        details: `Changed status to ${newStatus}`,
        performedBy: auth.currentUser?.email || "Unknown Dispatcher",
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update ticket status.");
    }
  };

  const openAssignForm = (ticket) => {
    setAssigningId(ticket.id);
    setTechName(ticket.technicianName || "");
    setTechContact(ticket.technicianContact || "");
  };

  const handleAssignTechnician = async (ticketId) => {
    const nameParts = techName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      alert("Validation Error: Please provide both the First and Last name of the technician.");
      return;
    }

    const phoneRegex = /^(\+254|0)\d{9}$/;
    if (!phoneRegex.test(techContact.trim())) {
      alert("Validation Error: Phone number must be in a valid Kenyan format (e.g., 07XXXXXXXX or +254XXXXXXXXX).");
      return;
    }

    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { 
        status: "Dispatched",
        technicianName: techName.trim(),
        technicianContact: techContact.trim()
      });
      
      // --- NEW: Record a receipt in the audit_logs collection ---
      await addDoc(collection(db, "audit_logs"), {
        ticketId: ticketId,
        action: "Technician Assignment",
        details: `Assigned technician ${techName.trim()} (${techContact.trim()})`,
        performedBy: auth.currentUser?.email || "Unknown Dispatcher",
        timestamp: serverTimestamp()
      });
      
      setAssigningId(null);
      setTechName("");
      setTechContact("");
    } catch (error) {
      console.error("Error assigning technician: ", error);
      alert("Failed to assign technician.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "Pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Dispatched": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Resolved": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Closed": return "bg-slate-200 text-slate-600 border-slate-300"; 
      case "Cancelled": return "bg-red-50 text-red-500 border-red-200"; 
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const totalReports = tickets.length;
  const pendingReports = tickets.filter(t => t.status === "Pending").length;
  const dispatchedReports = tickets.filter(t => t.status === "Dispatched").length;

  const displayedTickets = activeTab === "active" 
    ? tickets.filter(t => t.status !== "Closed" && t.status !== "Cancelled") 
    : tickets;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex">
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
              <LayoutDashboard className="w-5 h-5" /> Dispatch Center
            </button>
            <button 
              onClick={() => setActiveTab("all")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                activeTab === "all" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <FileText className="w-5 h-5" /> All Records
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Logged in as</p>
          <p className="text-sm font-bold text-slate-900 truncate mb-4">
            {auth.currentUser?.email || "dispatcher@madaraka.com"}
          </p>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors">
            <LogOut className="w-5 h-5" /> Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Dispatcher Dashboard</h2>
            <p className="text-slate-500 mt-2">Manage, assign, and track incoming utility issues.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-2">Total Reports</p>
              <p className="text-4xl font-extrabold text-slate-900">{totalReports}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-2">Pending</p>
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
                    {activeTab === "active" ? "There are no active utility issues." : "No records found in the database."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {displayedTickets.map((ticket) => {
                    
                    const isPendingDisabled = 
                      ticket.status === "Dispatched" || 
                      ticket.status === "Resolved" || 
                      ticket.status === "Closed" || 
                      ticket.status === "Cancelled" || 
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
                      <div key={ticket.id} className={`bg-slate-50 rounded-xl border flex flex-col overflow-hidden transition-all hover:shadow-md ${ticket.status === 'Cancelled' ? 'border-red-100 opacity-75' : 'border-slate-200 hover:border-blue-200'}`}>
                        
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
                                  placeholder="07XXXXXXXX or +254XXXXXXXXX" 
                                  value={techContact}
                                  onChange={(e) => setTechContact(e.target.value)}
                                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleAssignTechnician(ticket.id)}
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
                                {ticket.technicianName ? "Reassign Tech" : "Assign & Dispatch"}
                              </button>
                              
                              <button 
                                onClick={() => handleStatusChange(ticket.id, "Resolved")}
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
      </main>
    </div>
  );
}