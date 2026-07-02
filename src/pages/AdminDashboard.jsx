// ==========================================
// 1. IMPORTS: Core React and Routing tools
// ==========================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// FIREBASE CORE: Authentication and Database functions
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, orderBy, where, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// SECONDARY FIREBASE APP
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut as signOutSecondary, sendPasswordResetEmail } from "firebase/auth";

// UI ICONS
import { 
  LogOut, ShieldAlert, Users, Activity, FileText, 
  ShieldCheck, UserPlus, X, Droplet, Zap, Trash2, Ban, CheckCircle2, MessageSquare, Mail, Inbox, Check
} from "lucide-react";

import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell'; 
import { addDoc, serverTimestamp } from 'firebase/firestore'; 

const firebaseConfig = {
  apiKey: "AIzaSyCReY3q16xv34cC7db4QDzaKx4Ez0PZvG0",
  authDomain: "madaraka-utility-system.firebaseapp.com",
  projectId: "madaraka-utility-system",
  storageBucket: "madaraka-utility-system.firebasestorage.app",
  messagingSenderId: "383518085395",
  appId: "1:383518085395:web:662d895f8e34fb85810ae6",
  measurementId: "G-S1JX78Z1BS"
};

const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

export default function AdminDashboard() {
  const [user, setUser] = useState(null); 
  
  const [tickets, setTickets] = useState([]);
  const [platformUsers, setPlatformUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]); 
  const [adminMessages, setAdminMessages] = useState([]); 
  
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDepartment, setNewDepartment] = useState("Water Services");
  const [isProvisioning, setIsProvisioning] = useState(false); 

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedDispatcher, setSelectedDispatcher] = useState(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // --- NEW: State to track which ticket buttons were just clicked ---
  const [pingedTickets, setPingedTickets] = useState({});

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        const qTickets = query(collection(db, "tickets"));
        const unsubTickets = onSnapshot(qTickets, (snapshot) => {
          const fetchedTickets = [];
          snapshot.forEach((doc) => fetchedTickets.push({ id: doc.id, ...doc.data() }));
          setTickets(fetchedTickets);
        });

        const qUsers = query(collection(db, "users"));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
          const fetchedUsers = [];
          snapshot.forEach((doc) => fetchedUsers.push({ id: doc.id, ...doc.data() }));
          setPlatformUsers(fetchedUsers);
        });

        const qLogs = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
          const fetchedLogs = [];
          snapshot.forEach((doc) => fetchedLogs.push({ id: doc.id, ...doc.data() }));
          setAuditLogs(fetchedLogs);
        });

        const qMessages = query(collection(db, "notifications"), where("recipientId", "==", "admin"));
        const unsubMessages = onSnapshot(qMessages, (snapshot) => {
          const fetchedMsgs = [];
          snapshot.forEach((doc) => fetchedMsgs.push({ id: doc.id, ...doc.data() }));
          fetchedMsgs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setAdminMessages(fetchedMsgs);
        });

        return () => { unsubTickets(); unsubUsers(); unsubLogs(); unsubMessages(); };
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
    window.scrollTo(0, 0); 
  };

  const handleAcknowledgeEscalation = async (ticketId) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      const ticket = tickets.find(t => t.id === ticketId);
      
      await updateDoc(ticketRef, { 
        status: "Admin_Reviewed",
        adminReviewedAt: new Date()
      });

      // --- UPDATED: Ensures every single ping gets its own unique audit log ---
      await setDoc(doc(db, "audit_logs", `${ticketId}_admin_review_${Date.now()}`), {
        ticketId: ticketId,
        action: ticket?.status === "Admin_Reviewed" ? "Admin Re-Ping" : "Admin Review",
        details: "Administrator flagged the escalation to the dispatcher.",
        performedBy: auth.currentUser?.email || "System Admin",
        timestamp: new Date()
      });

      // --- NEW: Visual UI Button Feedback (Locks button for 3 seconds) ---
      setPingedTickets(prev => ({ ...prev, [ticketId]: true }));
      setTimeout(() => {
        setPingedTickets(prev => ({ ...prev, [ticketId]: false }));
      }, 3000);

      toast.success("Dispatcher pinged successfully!");
      
      if (ticket) {
        await addDoc(collection(db, "notifications"), {
          recipientId: `dispatcher_${ticket.category}`, 
          title: "Admin Ping: Urgent Ticket",
          message: `Admin has reviewed an escalated ticket for ${ticket.category}. Please resolve immediately.`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error("Error acknowledging escalation: ", error);
      toast.error("Failed to acknowledge escalation.");
    }
  };

  const handleProvisionDispatcher = async (e) => {
    e.preventDefault(); 

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Validation Error: Please enter a valid email address.");
      return; 
    }

    if (!newAgencyName.trim()) {
      toast.error("Validation Error: Please provide an Agency / Display Name.");
      return;
    }

    setIsProvisioning(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newEmail,
        agencyName: newAgencyName.trim(),
        role: "Dispatcher",
        department: newDepartment,
        status: "Active",
        createdAt: new Date()
      });

      await sendPasswordResetEmail(secondaryAuth, newEmail);
      await signOutSecondary(secondaryAuth);
      
      setShowModal(false);
      setNewAgencyName("");
      setNewEmail("");
      setNewPassword("");
      toast.success(`Success! Dispatcher provisioned. A password reset link has been sent to ${newEmail}.`);

    } catch (error) {
      console.error("Provisioning Error:", error);
      toast.error("Error: " + error.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!adminMessage.trim()) return;
    
    setIsSendingMessage(true);
    try {
      await addDoc(collection(db, "notifications"), {
        recipientId: `dispatcher_${selectedDispatcher.department}`,
        title: "Admin Message",
        message: adminMessage.trim(),
        read: false,
        createdAt: serverTimestamp()
      });
      
      toast.success(`Message sent to ${selectedDispatcher.agencyName || selectedDispatcher.department}!`);
      setMessageModalOpen(false);
      setAdminMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "Suspended" ? "Active" : "Suspended";
    try {
      await updateDoc(doc(db, "users", userId), { status: newStatus });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status.");
    }
  };

  const markMessageAsRead = async (msgId) => {
    try {
      await updateDoc(doc(db, "notifications", msgId), { read: true });
    } catch (error) {
      console.error("Error marking message read:", error);
    }
  };

  if (!user) return null;

  const activeResidentsCount = platformUsers.filter(u => u.role === "Resident").length;
  const activeDispatchersCount = platformUsers.filter(u => u.role === "Dispatcher").length;
  
  const waterTickets = tickets.filter(t => t.category === "Water Services").length;
  const electricityTickets = tickets.filter(t => t.category === "Electricity Services").length;
  const wasteTickets = tickets.filter(t => t.category === "Waste Management").length;

  const requiresAttention = tickets.filter(t => t.status === "Escalated" || t.status === "Admin_Reviewed");
  
  const unreadInboxCount = adminMessages.filter(m => !m.read).length;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden relative">
      
      {/* --- PROVISION MODAL --- */}
      {showModal && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Provision Dispatcher</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleProvisionDispatcher} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Agency / Display Name</label>
                <input type="text" required value={newAgencyName} onChange={e => setNewAgencyName(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="e.g., Nairobi Water Company" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Routing Email Address</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="eniolafabunmi+water@gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Temporary Password</label>
                <input type="password" required minLength="6" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Utility Department</label>
                <select value={newDepartment} onChange={e => setNewDepartment(e.target.value)} className="w-full p-3 border rounded-xl bg-white">
                  <option>Water Services</option>
                  <option>Electricity Services</option>
                  <option>Waste Management</option>
                </select>
              </div>
              <button type="submit" disabled={isProvisioning} className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50">
                {isProvisioning ? "Creating Account..." : "Create Dispatcher Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MESSAGE MODAL --- */}
      {messageModalOpen && selectedDispatcher && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Message Dispatcher</h3>
              <button 
                onClick={() => { setMessageModalOpen(false); setAdminMessage(""); }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-500">
                Sending an alert to <span className="font-bold text-slate-900">{selectedDispatcher.agencyName || selectedDispatcher.email}</span> ({selectedDispatcher.department}).
              </p>
            </div>
            
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Your Message</label>
                <textarea 
                  required 
                  value={adminMessage} 
                  onChange={e => setAdminMessage(e.target.value)} 
                  rows="4" 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600" 
                  placeholder="E.g., You have 3 escalated tickets. Please resolve them immediately." 
                />
              </div>
              <div className="flex flex-col gap-3 mt-2">
                <button 
                  type="submit" 
                  disabled={isSendingMessage} 
                  className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> 
                  {isSendingMessage ? "Sending..." : "Send In-App Alert"}
                </button>
                
                <a 
                  href={`mailto:${selectedDispatcher.email}?subject=Urgent:%20Escalated%20Tickets%20Review`} 
                  className="w-full bg-slate-100 text-slate-700 p-3 rounded-xl font-bold hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <Mail className="w-4 h-4" /> Send Direct Email
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN SIDEBAR --- */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 hidden md:flex z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-emerald-400" />
          <h1 className="text-xl font-extrabold tracking-tight">System <span className="text-emerald-400">Admin</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab("overview")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "overview" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Activity className="h-5 w-5" /> System Overview
          </button>
          <button onClick={() => setActiveTab("users")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "users" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Users className="h-5 w-5" /> User Management
          </button>
          
          <button onClick={() => setActiveTab("inbox")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "inbox" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Inbox className="h-5 w-5" /> Support Inbox
            {unreadInboxCount > 0 && (
              <span className="ml-auto bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadInboxCount} New
              </span>
            )}
          </button>

          <button onClick={() => setActiveTab("audit")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "audit" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <FileText className="h-5 w-5" /> Audit Logs
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <p className="text-xs text-slate-400 uppercase">Admin Session</p>
          <p className="text-sm font-bold truncate mb-4">{user.email}</p> 
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-xl font-semibold"><LogOut className="h-5 w-5" /> Log Out</button>
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* --- FIXED HEADER --- */}
        <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 flex items-center justify-between shadow-sm shrink-0 z-10">
          <h2 className="text-2xl font-extrabold tracking-tight capitalize text-slate-900">
            {activeTab.replace("-", " ")}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">Admin Alerts</span>
            <NotificationBell recipientId="admin" />
          </div>
        </header>

        {/* --- SCROLLABLE CONTENT --- */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">

          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <span className="text-sm font-medium text-slate-500">Total System Tickets</span>
                  <span className="block text-4xl font-extrabold text-blue-600">{tickets.length}</span>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <span className="text-sm font-medium text-slate-500">Active Residents</span>
                  <span className="block text-4xl font-extrabold text-emerald-600">{activeResidentsCount}</span>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <span className="text-sm font-medium text-slate-500">Active Dispatchers</span>
                  <span className="block text-4xl font-extrabold text-amber-600">{activeDispatchersCount}</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">Ticket Breakdown by Utility</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 flex items-center justify-between">
                    <div className="flex items-center gap-3"><Droplet className="text-sky-500"/> <span className="font-semibold text-sky-900">Water</span></div>
                    <span className="text-2xl font-bold text-sky-700">{waterTickets}</span>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-3"><Zap className="text-amber-500"/> <span className="font-semibold text-amber-900">Electricity</span></div>
                    <span className="text-2xl font-bold text-amber-700">{electricityTickets}</span>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-3"><Trash2 className="text-emerald-500"/> <span className="font-semibold text-emerald-900">Waste</span></div>
                    <span className="text-2xl font-bold text-emerald-700">{wasteTickets}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ShieldAlert className="text-red-500"/> Requires Admin Attention
                </h3>
                
                {requiresAttention.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 flex flex-col items-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2"/> 
                    No tickets currently require admin intervention.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requiresAttention.map(ticket => {
                      const isPinged = pingedTickets[ticket.id];
                      
                      return (
                        <div key={ticket.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-l-4 border-l-red-500">
                          <div>
                            <p className="font-bold text-slate-900">
                              {ticket.category} 
                              <span className="text-red-500 text-xs ml-2 font-bold uppercase tracking-wider bg-red-50 px-2 py-1 rounded-md">
                                {ticket.status === "Admin_Reviewed" ? "Admin Pinged" : "Escalated"}
                              </span>
                            </p>
                            <p className="text-sm text-slate-500 mt-1">{ticket.description}</p>
                            <p className="text-xs text-slate-400 mt-2 font-medium">Resident: {ticket.residentEmail}</p>
                          </div>
                          
                          {/* --- UPDATED: Dynamic Button States --- */}
                          <button 
                            onClick={() => handleAcknowledgeEscalation(ticket.id)}
                            disabled={isPinged}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors shrink-0 flex items-center justify-center gap-2 min-w-[160px] ${
                              isPinged 
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-not-allowed"
                                : ticket.status === "Admin_Reviewed" 
                                  ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" 
                                  : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" /> 
                            {isPinged ? "Ping Sent!" : ticket.status === "Admin_Reviewed" ? "Ping Again" : "Acknowledge & Ping"}
                          </button>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold">Platform Users</h3>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800">
                  <UserPlus className="h-4 w-4" /> Provision Dispatcher
                </button>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4">User / Agency</th>
                    <th className="p-4">Role / Dept</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {platformUsers.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-500">No users found.</td></tr>}
                  
                  {platformUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-900">{u.agencyName || u.email}</p>
                        {u.agencyName && <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          u.role === 'Dispatcher' ? 'bg-amber-100 text-amber-700' : 
                          u.role === 'Administrator' ? 'bg-slate-800 text-white' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role || "Resident"}
                        </span>
                        {u.department && <span className="block text-xs text-slate-500 mt-1">{u.department}</span>}
                      </td>
                      <td className="p-4">
                        <span className={`font-semibold flex items-center gap-1 ${u.status === "Suspended" ? "text-red-500" : "text-emerald-600"}`}>
                          {u.status || "Active"}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-3">
                        {u.role === "Resident" && (
                          <button 
                            onClick={() => toggleUserStatus(u.id, u.status || "Active")}
                            className={`flex items-center justify-end gap-1 text-xs font-bold ${u.status === "Suspended" ? "text-emerald-600 hover:text-emerald-700" : "text-red-500 hover:text-red-700"}`}
                          >
                            {u.status === "Suspended" ? <><CheckCircle2 className="h-4 w-4"/> Reactivate</> : <><Ban className="h-4 w-4"/> Suspend</>}
                          </button>
                        )}
                        {u.role === "Dispatcher" && (
                          <button 
                            onClick={() => { setSelectedDispatcher(u); setMessageModalOpen(true); }}
                            className="flex items-center justify-end gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <MessageSquare className="h-4 w-4"/> Message
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "inbox" && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Support Inbox</h3>
                  <p className="text-sm text-slate-500 mt-1">Incoming messages from platform residents and dispatchers.</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {adminMessages.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                    <Inbox className="h-10 w-10 text-slate-300 mb-3" />
                    <p>No support messages yet.</p>
                  </div>
                ) : (
                  adminMessages.map(msg => (
                    <div key={msg.id} className={`p-6 transition-colors ${msg.read ? 'bg-white opacity-75' : 'bg-slate-50'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {msg.read ? <Check className="w-4 h-4 text-emerald-500" /> : <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                            <h4 className={`text-sm ${msg.read ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>{msg.title}</h4>
                          </div>
                          <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {msg.createdAt ? msg.createdAt.toDate().toLocaleString() : 'Just now'}
                          </p>
                        </div>
                        {!msg.read && (
                          <button 
                            onClick={() => markMessageAsRead(msg.id)}
                            className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-lg font-bold">System Audit Logs</h3>
                <p className="text-sm text-slate-500">Track dispatcher status changes and administrative actions.</p>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">User (Email)</th>
                    <th className="p-4">Action Performed</th>
                    <th className="p-4">Target Ticket ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-500">
                        <ShieldAlert className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                        No audit logs found yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-500">
                          {log.timestamp ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                        </td>
                        <td className="p-4 font-bold text-slate-900">{log.performedBy}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-xs font-bold uppercase tracking-wider">
                            {log.action}
                          </span>
                          <span className="block text-sm text-slate-600 mt-2">{log.details}</span>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-400">
                          {log.ticketId.slice(0, 8)}...
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}