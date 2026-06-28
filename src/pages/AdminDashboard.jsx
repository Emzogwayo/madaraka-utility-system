// ==========================================
// 1. IMPORTS: Core React and Routing tools
// ==========================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// FIREBASE CORE: Authentication and Database functions
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// SECONDARY FIREBASE APP: We import initializeApp specifically to create a "shadow" connection
// This allows the Admin to create new user accounts without Firebase automatically logging the Admin out.
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut as signOutSecondary } from "firebase/auth";

// UI ICONS: Importing scalable vector graphics from Lucide
import { 
  LogOut, ShieldAlert, Users, Activity, FileText, 
  ShieldCheck, UserPlus, X, Droplet, Zap, Trash2, Ban, CheckCircle2
} from "lucide-react";

// ==========================================
// 2. FIREBASE CONFIGURATION
// ==========================================
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
  // ==========================================
  // 3. STATE MANAGEMENT (The Component's Memory)
  // ==========================================
  const [user, setUser] = useState(null); 
  
  // LIVE DATABASE STATE
  const [tickets, setTickets] = useState([]);
  const [platformUsers, setPlatformUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]); // ENIOLA'S ADDITION: Holds the audit logs
  
  // UI STATE
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  // MODAL STATE
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDepartment, setNewDepartment] = useState("Water Services");
  const [isProvisioning, setIsProvisioning] = useState(false); 

  // ==========================================
  // 4. LIFECYCLE & REAL-TIME DATA FETCHING
  // ==========================================
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // FETCH 1: Tickets Collection
        const qTickets = query(collection(db, "tickets"));
        const unsubTickets = onSnapshot(qTickets, (snapshot) => {
          const fetchedTickets = [];
          snapshot.forEach((doc) => fetchedTickets.push({ id: doc.id, ...doc.data() }));
          setTickets(fetchedTickets);
        });

        // FETCH 2: Users Collection
        const qUsers = query(collection(db, "users"));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
          const fetchedUsers = [];
          snapshot.forEach((doc) => fetchedUsers.push({ id: doc.id, ...doc.data() }));
          setPlatformUsers(fetchedUsers);
        });

        // FETCH 3: Audit Logs Collection (ENIOLA'S ADDITION)
        const qLogs = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
          const fetchedLogs = [];
          snapshot.forEach((doc) => fetchedLogs.push({ id: doc.id, ...doc.data() }));
          setAuditLogs(fetchedLogs);
        });

        return () => { unsubTickets(); unsubUsers(); unsubLogs(); };
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // ==========================================
  // 5. DISPATCHER PROVISIONING LOGIC
  // ==========================================
  const handleProvisionDispatcher = async (e) => {
    e.preventDefault(); 

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      alert("Validation Error: Please enter a valid email address (e.g., tech@kplc.co.ke)");
      return; 
    }

    setIsProvisioning(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newEmail,
        role: "Dispatcher",
        department: newDepartment,
        status: "Active",
        createdAt: new Date()
      });

      await signOutSecondary(secondaryAuth);
      
      setShowModal(false);
      setNewEmail("");
      setNewPassword("");
      alert("Dispatcher successfully provisioned!");

    } catch (error) {
      console.error("Provisioning Error:", error);
      alert("Error: " + error.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  // ==========================================
  // 6. USER SUSPENSION LOGIC
  // ==========================================
  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "Suspended" ? "Active" : "Suspended";
    try {
      await updateDoc(doc(db, "users", userId), { status: newStatus });
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Failed to update user status.");
    }
  };

  if (!user) return null;

  // ==========================================
  // 7. DATA PROCESSING & ANALYTICS
  // ==========================================
  const activeResidentsCount = platformUsers.filter(u => u.role === "Resident").length;
  const activeDispatchersCount = platformUsers.filter(u => u.role === "Dispatcher").length;
  
  const waterTickets = tickets.filter(t => t.category === "Water Services").length;
  const electricityTickets = tickets.filter(t => t.category === "Electricity Services").length;
  const wasteTickets = tickets.filter(t => t.category === "Waste Management").length;

  const requiresAttention = tickets.filter(t => t.status === "Escalated" || t.status === "Pending_Escalation");

  // ==========================================
  // 8. THE UI RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900 relative">
      
      {/* --- FLOATING MODAL: PROVISION DISPATCHER --- */}
      {showModal && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Provision Dispatcher</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleProvisionDispatcher} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Email Address</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="water.tech@nairobiwater.co.ke" />
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

      {/* --- ADMIN SIDEBAR (DARK THEME) --- */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-emerald-400" />
          <h1 className="text-xl font-extrabold tracking-tight">System <span className="text-emerald-400">Admin</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab("overview")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "overview" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Activity className="h-5 w-5" /> System Overview
          </button>
          <button onClick={() => setActiveTab("users")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "users" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <Users className="h-5 w-5" /> User Management
          </button>
          <button onClick={() => setActiveTab("audit")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "audit" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            <FileText className="h-5 w-5" /> Audit Logs
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 uppercase">Admin Session</p>
          <p className="text-sm font-bold truncate mb-4">{user.email}</p> 
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-xl font-semibold"><LogOut className="h-5 w-5" /> Log Out</button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <h2 className="text-3xl font-extrabold tracking-tight capitalize mb-10">{activeTab.replace("-", " ")}</h2>

        {/* ========================================== */}
        {/* TAB 1: SYSTEM OVERVIEW                     */}
        {/* ========================================== */}
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
            
            {/* LIVE ESCALATED TICKETS LIST */}
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
                  {requiresAttention.map(ticket => (
                    <div key={ticket.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-l-4 border-l-red-500">
                      <div>
                        <p className="font-bold text-slate-900">
                          {ticket.category} 
                          <span className="text-red-500 text-xs ml-2 font-bold uppercase tracking-wider bg-red-50 px-2 py-1 rounded-md">
                            {ticket.status}
                          </span>
                        </p>
                        <p className="text-sm text-slate-500 mt-1">{ticket.description}</p>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Resident: {ticket.residentEmail}</p>
                      </div>
                      <button 
                        onClick={() => {
                          let dispatcherEmail = "";
                          if (ticket.category === "Water Services") dispatcherEmail = "madaraka.water.demo@gmail.com";
                          else if (ticket.category === "Electricity Services") dispatcherEmail = "madaraka.power.demo@gmail.com";
                          else dispatcherEmail = "madaraka.waste.demo@gmail.com";

                          const subject = encodeURIComponent(`URGENT ESCALATION: Madaraka Connect Ticket ${ticket.id.slice(0,6)}`);
                          const body = encodeURIComponent(`Hello,\n\nThis is an automated escalation from the Madaraka Connect System Administrator.\n\nA ticket has exceeded the maximum pending timeframe and requires immediate attention.\n\nTicket Details:\n- Category: ${ticket.category}\n- Issue: ${ticket.description}\n- Reported By: ${ticket.residentEmail}\n\nPlease log into the Dispatcher Portal to assign a technician immediately.\n\nRegards,\nSystem Admin`);

                          window.location.href = `mailto:${dispatcherEmail}?subject=${subject}&body=${body}`;
                        }}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shrink-0"
                      >
                        Contact Dispatcher
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: USER MANAGEMENT                     */}
        {/* ========================================== */}
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
                  <th className="p-4">Email</th>
                  <th className="p-4">Role / Dept</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {platformUsers.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-500">No users found.</td></tr>}
                
                {platformUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium">{u.email}</td>
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
                    <td className="p-4 text-right">
                      {u.role === "Resident" && (
                        <button 
                          onClick={() => toggleUserStatus(u.id, u.status || "Active")}
                          className={`flex items-center justify-end gap-1 ml-auto text-xs font-bold ${u.status === "Suspended" ? "text-emerald-600 hover:text-emerald-700" : "text-red-500 hover:text-red-700"}`}
                        >
                          {u.status === "Suspended" ? <><CheckCircle2 className="h-4 w-4"/> Reactivate</> : <><Ban className="h-4 w-4"/> Suspend</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: AUDIT LOGS (ENIOLA'S IMPLEMENTATION)*/}
        {/* ========================================== */}
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
  );
}