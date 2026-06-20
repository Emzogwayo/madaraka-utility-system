import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, AlertCircle, Loader2, MapPin, Camera } from "lucide-react";
// Firebase imports for getting the user and saving data
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function ReportForm() {
  const navigate = useNavigate();
  
  // 1. STATE VARIABLES
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 2. FORM SUBMISSION LOGIC
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation: Make sure they selected a category
    if (!category) {
      setError("Please select a utility category.");
      return;
    }

    setLoading(true);

    try {
      // Get the currently logged-in user so we know who is submitting the ticket
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError("You must be logged in to submit a report.");
        setLoading(false);
        return;
      }

      // Save the ticket to a new Firestore collection called "tickets"
      await addDoc(collection(db, "tickets"), {
        residentId: currentUser.uid,
        residentEmail: currentUser.email,
        category: category,
        description: description,
        status: "Pending", // All new tickets start as Pending
        createdAt: serverTimestamp(), // Firebase records the exact server time
        // Note: Map coordinates and photos will be added here by Eniola next week!
      });

      // Once successfully saved, send them back to the dashboard
      navigate("/dashboard");
      
    } catch (err) {
      console.error("Error adding document: ", err);
      setError("Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard" className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Report a Fault</h1>
            <p className="text-slate-500 text-sm">Submit a new utility issue to the dispatch team.</p>
          </div>
        </div>

        {/* The Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            
            {error && (
              <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Section 1: Utility Category */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">1. Select Service Category <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["Water Services", "Electricity Services", "Waste Management"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-4 border-2 rounded-xl text-sm font-semibold transition-all ${
                      category === cat 
                        ? "border-blue-600 bg-blue-50 text-blue-700" 
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Issue Description */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">2. Describe the Issue <span className="text-red-500">*</span></label>
              <textarea
                required
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., A water pipe burst in front of House 42..."
                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 transition-colors bg-slate-50 focus:bg-white text-slate-900"
              />
            </div>

            {/* Section 3: Placeholders for Eniola (Map & Photo) */}
            <div className="border-t border-slate-100 pt-8 opacity-60">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4" /> Location & Evidence (Coming Soon)
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center flex-col text-slate-400">
                  <MapPin className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">GIS Map Integration Area</span>
                </div>
                <div className="h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center flex-col text-slate-400">
                  <Camera className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">Photo Upload Area</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Submit Report
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}