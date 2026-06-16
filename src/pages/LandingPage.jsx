// 1. IMPORTS: Bringing in the tools we need
import React from "react";
// 'Link' is used instead of standard <a> tags so the page doesn't reload when navigating
import { Link } from "react-router-dom"; 
// Importing specific SVG icons from the lucide-react library
import {
  Clock,
  Map as MapIcon,
  Camera,
  RefreshCw,
  FileText,
  MapPin,
  Truck,
  Search,
  ArrowRight,
  Droplet,
  Zap,
  Trash2,
} from "lucide-react";

export default function LandingPage() {
  
  // 2. DATA ARRAYS: Instead of hard-coding every single box, we store the data in arrays.
  // Later, we use the .map() function to loop through these and generate the UI automatically.
  // This is a core React principle called "DRY" (Don't Repeat Yourself).
  
  const categories = [
    { icon: Droplet, label: "Water Services", color: "text-sky-500" },
    { icon: Zap, label: "Electricity Services", color: "text-amber-500" },
    { icon: Trash2, label: "Waste Management", color: "text-emerald-500" },
  ];

  const benefits = [
    { icon: Clock, label: "Real-Time Tracking" },
    { icon: MapIcon, label: "Geolocation" },
    { icon: Camera, label: "Photo Evidence" },
    { icon: RefreshCw, label: "Automated Routing" },
  ];

  const steps = [
    { icon: FileText, label: "Report Issue" },
    { icon: MapPin, label: "Pin Location" },
    { icon: Truck, label: "Dispatch" },
    { icon: Search, label: "Track Resolution" },
  ];

  // 3. THE UI RENDER: Everything inside the return() statement is what the user actually sees.
  return (
    // The main wrapper div. 'min-h-screen' ensures it takes up at least the full height of the monitor.
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* --- NAVBAR --- */}
      {/* sticky top-0 ensures the navbar stays at the top of the screen when scrolling */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          
          {/* Logo that links back to the home page ("/") */}
          <Link to="/" className="text-xl font-extrabold tracking-tight">
            Madaraka <span className="text-blue-600">Connect</span>
          </Link>
          
          {/* Center Links - hidden on mobile (hidden), visible on medium screens and up (md:flex) */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#home" className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">Home</a>
            <a href="#about" className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">About</a>
          </div>
          
          {/* Action Buttons linking to the Login Page we will build next */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg">
              Register
            </Link>
            <Link to="/login" className="rounded-xl border-2 border-blue-600 px-5 py-2 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-50">
              Log In
            </Link>
          </div>
        </nav>
      </header>

      {/* --- HERO SECTION (The big top section) --- */}
      <section id="home" className="bg-white">
        {/* lg:grid-cols-2 splits this section into two columns on large screens (text on left, image on right) */}
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          
          {/* Left Column: Text & Buttons */}
          <div>
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Madaraka Estate
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl text-slate-900">
              Report Utility Faults <br className="hidden sm:block" />
              in Madaraka Estate
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-500">
              Fast, transparent and accurate dispatch for water, electricity and waste issues.
            </p>
            <p className="mt-3 max-w-xl text-base text-slate-500">
              A centralized platform connecting Madaraka residents with utility providers for faster service resolution.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" className="group inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-600 hover:shadow-xl">
                Report an Issue
                {/* group-hover translates the arrow slightly to the right when you hover over the button */}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <button className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-semibold text-slate-900 transition-all hover:bg-slate-50">
                Learn More
              </button>
            </div>
          </div>

          {/* Right Column: Abstract Map SVG Graphic */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-blue-100 blur-3xl" />
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              {/* SVG drawing generated by AI to mimic a map */}
              <svg viewBox="0 0 600 420" className="h-full w-full">
                <rect width="600" height="420" fill="#eee8dc" />
                <g stroke="#ffffff" strokeWidth="14">
                  <line x1="0" y1="90" x2="600" y2="70" />
                  <line x1="0" y1="200" x2="600" y2="180" />
                  <line x1="0" y1="320" x2="600" y2="300" />
                  <line x1="120" y1="0" x2="140" y2="420" />
                  <line x1="300" y1="0" x2="320" y2="420" />
                  <line x1="470" y1="0" x2="490" y2="420" />
                </g>
                <path d="M0 250 Q 200 230 380 245 T 600 240" stroke="#bcd9a4" strokeWidth="44" fill="none" opacity="0.85" />
                <path d="M0 300 L 480 280 L 600 60" stroke="#fbd34a" strokeWidth="10" fill="none" />
                <circle cx="320" cy="210" r="14" fill="#3b82f6" />
                <circle cx="320" cy="210" r="26" fill="#3b82f6" opacity="0.25" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* --- SERVICE CATEGORIES LOOP --- */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Service Categories</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-500">
          Pick the category that matches your issue and we'll route it to the right team.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* This .map() function looks at the 'categories' array at the top of the file, 
              and creates a <div> box for each item automatically. */}
          {categories.map(({ icon: Icon, label, color }) => (
            <div
              key={label} // React requires a unique 'key' when mapping over arrays
              className="group flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 transition-colors group-hover:bg-blue-50 ${color}`}>
                <Icon className="h-8 w-8" />
              </div>
              <span className="text-lg font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- KEY BENEFITS LOOP --- */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Key Benefits</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            
            {/* Another .map() function to loop through the 'benefits' array */}
            {benefits.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="text-lg font-semibold text-slate-900">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS LOOP --- */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">How It Works</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-500">
          From report to resolution in four simple steps.
        </p>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* We use 'i' here to get the index number of the array (0, 1, 2, 3) to print "Step 1", "Step 2", etc. */}
          {steps.map(({ icon: Icon, label }, i) => (
            <div key={label} className="relative flex flex-col items-center text-center">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                <Icon className="h-9 w-9" />
              </div>
              <div className="mt-5 text-sm font-bold uppercase tracking-wider text-slate-400">
                Step {i + 1}
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{label}</div>
              
              {/* This draws the Arrow between the steps. It hides the arrow after the very last step. */}
              {i < steps.length - 1 && (
                <ArrowRight className="absolute right-[-20px] top-7 hidden h-6 w-6 text-slate-300 lg:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* --- BOTTOM CTA (CALL TO ACTION) BANNER --- */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-blue-600 px-8 py-16 text-center shadow-xl shadow-blue-600/30">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Join Madaraka Connect Today!
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-blue-100">
            Be part of a faster, more transparent neighborhood. Report your first issue in under a minute.
          </p>
          <Link to="/login" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-600 hover:shadow-xl">
            Report Now
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row">
          <div>Emergency Hotline: <span className="font-semibold text-slate-900">0700-000-000</span></div>
          <div>Support: <span className="font-semibold text-slate-900">support@madarakaconnect.com</span></div>
          <div>© 2026 Madaraka Connect. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}