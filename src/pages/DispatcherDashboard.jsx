import React from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function DispatcherDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col">
      <h1 className="text-3xl font-bold text-blue-700 mb-4">Dispatcher Dashboard</h1>
      <p className="text-slate-500 mb-8">This is where technicians will manage tickets.</p>
      <button onClick={handleLogout} className="bg-red-600 text-white px-6 py-2 rounded-xl">
        Log Out
      </button>
    </div>
  );
}