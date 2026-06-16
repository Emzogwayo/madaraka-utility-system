// ==========================================
// 1. IMPORTS: Bringing in external libraries and tools
// ==========================================
import React, { useState } from "react";
// 'useNavigate' is a React Router hook that lets us change pages using code (e.g., after logging in)
import { Link, useNavigate } from "react-router-dom";
// Importing UI icons to make the form look professional
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

// FIREBASE AUTH: These are the exact Google functions we use to check passwords or create accounts
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
// FIREBASE FIRESTORE: These functions allow us to read (getDoc) and write (setDoc) the user's role to the database
import { doc, setDoc, getDoc } from "firebase/firestore";
// Importing our specific Firebase database and auth connection from the firebase.js file we made
import { auth, db } from "../firebase";

export default function LoginPage() {
  // ==========================================
  // 2. STATE VARIABLES: The "Memory" of the page
  // ==========================================
  // 'isLogin' is a boolean (true/false). If true, show the Login form. If false, show the Register form.
  const [isLogin, setIsLogin] = useState(true);
  
  // These variables store exactly what the user is typing into the input boxes right now
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 'error' holds any error messages from Firebase (like "wrong password") to show the user
  const [error, setError] = useState("");
  // 'isLoading' tracks if we are waiting for Firebase to respond so we can show a spinning loading icon
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize the navigation tool
  const navigate = useNavigate();

  // ==========================================
  // 3. FORM SUBMISSION: The Core Logic
  // ==========================================
  // This asynchronous function runs when the user clicks "Sign In" or "Create Account"
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the browser from refreshing the page (which is the default HTML behavior)
    setError("");       // Clear out any old error messages from previous attempts
    setIsLoading(true); // Turn on the loading spinner on the button

    try {
      // CHECK: Is the user trying to log in, or register?
      if (isLogin) {
        
        // --- SCENARIO A: LOGGING IN ---
        // 1. Ask Firebase Auth to verify the email and password.
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // 2. Once verified, look up this specific user in our Firestore 'users' collection using their unique ID (uid).
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        // 3. ROLE-BASED ROUTING: Check the database document to see what their role is.
        if (userDoc.exists() && userDoc.data().role === "Dispatcher") {
          // If they are a dispatcher, send them to the admin backend
          navigate("/dispatcher-dashboard");
        } else {
          // If they are a resident (or if no role is found), send them to the resident portal
          navigate("/dashboard");
        }

      } else {
        
        // --- SCENARIO B: REGISTERING (RESIDENTS ONLY) ---
        // 1. Ask Firebase Auth to create a brand new account with this email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 2. AUTOMATIC ROLE ASSIGNMENT: We don't ask them for a role. We automatically create a 
        // document in Firestore and hard-code their role as "Resident" for security.
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          role: "Resident", 
          createdAt: new Date() // Records exactly when they joined
        });

        // 3. Send the newly registered resident straight to their dashboard
        navigate("/dashboard");
      }
    } catch (err) {
      // --- ERROR HANDLING ---
      console.error(err); // Log the technical error to the console for debugging
      
      // Translate ugly Firebase error codes into friendly human-readable messages
      if (err.code === 'auth/invalid-credential') setError("Incorrect email or password.");
      else if (err.code === 'auth/email-already-in-use') setError("An account with this email already exists.");
      else if (err.code === 'auth/weak-password') setError("Password must be at least 6 characters.");
      else setError("An error occurred. Please try again.");
    } finally {
      // --- CLEANUP ---
      // Whether the login succeeded or failed, we turn off the loading spinner
      setIsLoading(false);
    }
  };

  // ==========================================
  // 4. THE UI RENDER: What the user actually sees
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8 font-sans text-slate-900">
      
      {/* Top Section: Logo and Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="text-3xl font-extrabold tracking-tight">
          Madaraka <span className="text-blue-600">Connect</span>
        </Link>
        
        {/* Conditional Rendering: Changes text based on the 'isLogin' state */}
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          {isLogin ? "Sign in to your account" : "Create a new resident account"}
        </h2>
        
        {/* Toggle Button: Flips the 'isLogin' state from true to false (or false to true) */}
        <p className="mt-2 text-center text-sm text-slate-500">
          {isLogin ? "Or " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            {isLogin ? "register for a new account" : "sign in instead"}
          </button>
        </p>
      </div>

      {/* Form Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          {/* Form tag connects to our handleSubmit function above */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Conditional Error Box: Only renders if the 'error' state has text in it */}
            {error && (
              <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Email Input Field */}
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
                  // As the user types, update the 'email' state variable
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm"
                  placeholder="resident@madaraka.com"
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  // As the user types, update the 'password' state variable
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading} // Grays out the button and prevents double-clicking if we are loading
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {/* If isLoading is true, show the spinning icon. Otherwise, show the normal text */}
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