// ==========================================
// 1. IMPORTS: Bringing in external libraries and tools
// ==========================================
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle } from "lucide-react";

// FIREBASE AUTH
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function LoginPage() {
  // ==========================================
  // 2. STATE VARIABLES
  // ==========================================
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  // ==========================================
  // 3. FORM SUBMISSION
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError("");       
    setResetMessage(""); 
    setIsLoading(true); 

    try {
      if (isLogin) {
        // --- LOGGING IN ---
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        // 3-WAY ROLE-BASED ROUTING
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          
          if (role === "Dispatcher") {
            navigate("/dispatcher-dashboard");
          } else if (role === "Administrator") {
            navigate("/admin-dashboard");
          } else {
            navigate("/dashboard"); // Resident
          }
        } else {
          navigate("/dashboard");
        }

      } else {
        // --- REGISTERING (RESIDENTS ONLY) ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          role: "Resident", 
          createdAt: new Date()
        });

        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err); 
      
      if (err.code === 'auth/invalid-credential') setError("Incorrect email or password.");
      else if (err.code === 'auth/email-already-in-use') setError("An account with this email already exists.");
      else if (err.code === 'auth/weak-password') setError("Password must be at least 6 characters.");
      else setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- UPDATED: Better UX for Forgot Password ---
  const handleForgotPassword = async () => {
    let targetEmail = email;
    
    // If the email box is empty, prompt them for it cleanly
    if (!targetEmail) {
      targetEmail = window.prompt("Please enter your email address to reset your password:");
      if (!targetEmail) return; // If they click cancel on the prompt, do nothing
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetMessage(`Password reset link sent to ${targetEmail}! Please check your spam/promotions folder.`);
      setError(""); 
    } catch (err) {
      setError("Error: Could not send reset email. Please ensure the email is registered.");
      setResetMessage("");
    }
  };

  // ==========================================
  // 4. THE UI RENDER
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8 font-sans text-slate-900">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="text-3xl font-extrabold tracking-tight">
          Madaraka <span className="text-blue-600">Connect</span>
        </Link>
        
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          {isLogin ? "Sign in to your account" : "Create a new resident account"}
        </h2>
        
        <p className="mt-2 text-center text-sm text-slate-500">
          {isLogin ? "Or " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(""); 
              setResetMessage("");
            }}
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            {isLogin ? "register for a new account" : "sign in instead"}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {error && (
              <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {resetMessage && (
              <div className="flex items-center gap-2 p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <p>{resetMessage}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm"
                  placeholder="resident@madaraka.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required={!resetMessage} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}