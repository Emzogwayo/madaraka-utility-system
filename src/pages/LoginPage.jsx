// 1. IMPORTS
import React, { useState } from "react";
// useNavigate allows us to programmatically send the user to a new page after they log in
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

// FIREBASE IMPORTS: These are the exact functions Google provides to log people in
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
// We import the 'auth' object we initialized in your firebase.js file yesterday
import { auth } from "../firebase";

export default function LoginPage() {
  // 2. STATE MANAGEMENT (The Memory of the Component)
  // 'isLogin' tracks if the user is looking at the Sign In form or the Register form
  const [isLogin, setIsLogin] = useState(true);
  
  // These track exactly what the user is typing into the input boxes
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // These track the status of the form (are we waiting for Firebase? did Firebase give an error?)
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // 3. THE SUBMIT FUNCTION (The Brains)
  // This runs when the user clicks the "Sign In" or "Create Account" button
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stops the page from refreshing when the form submits
    setError("");       // Clears any old errors
    setIsLoading(true); // Turns on the spinning loading animation

    try {
      if (isLogin) {
        // ACTION A: Log in an existing user
        await signInWithEmailAndPassword(auth, email, password);
        // If successful, send them to the dashboard!
        navigate("/dashboard"); 
      } else {
        // ACTION B: Create a brand new user
        await createUserWithEmailAndPassword(auth, email, password);
        // If successful, send them to the dashboard!
        navigate("/dashboard");
      }
    } catch (err) {
      // If Firebase rejects the attempt (e.g., wrong password, email taken), we catch the error and show it
      console.error(err);
      // Clean up the ugly Firebase error codes into readable text
      if (err.code === 'auth/invalid-credential') setError("Incorrect email or password.");
      else if (err.code === 'auth/email-already-in-use') setError("An account with this email already exists.");
      else if (err.code === 'auth/weak-password') setError("Password must be at least 6 characters.");
      else setError("An error occurred. Please try again.");
    } finally {
      // Whether it succeeded or failed, turn off the loading animation
      setIsLoading(false);
    }
  };

  // 4. THE UI RENDER
  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8 font-sans text-slate-900">
      
      {/* Top Logo / Home Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="text-3xl font-extrabold tracking-tight">
          Madaraka <span className="text-blue-600">Connect</span>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          {isLogin ? "Sign in to your account" : "Create a new account"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          {isLogin ? "Or " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)} // This swaps the form from Login to Register
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            {isLogin ? "register for a new account" : "sign in instead"}
          </button>
        </p>
      </div>

      {/* The Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Error Message Box (Only shows if there is an error) */}
            {error && (
              <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Email Input */}
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
                  onChange={(e) => setEmail(e.target.value)} // Updates the 'email' state as the user types
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm"
                  placeholder="resident@madaraka.com"
                />
              </div>
            </div>

            {/* Password Input */}
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
                  onChange={(e) => setPassword(e.target.value)} // Updates the 'password' state as the user types
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-blue-600 focus:border-blue-600 transition-colors bg-slate-50 focus:bg-white text-slate-900 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading} // Disables the button while waiting for Firebase
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {/* If isLoading is true, show a spinning icon. Otherwise, show the text */}
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