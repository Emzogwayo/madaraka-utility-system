import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
// Added 'X' icon for the remove image button
import { ArrowLeft, Send, AlertCircle, Loader2, MapPin, Camera, Navigation, X } from "lucide-react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  React.useEffect(() => {
    if (position) {
      map.flyTo(position, 17, { duration: 1.5 });
    }
  }, [position, map]);

  return position === null ? null : <Marker position={position}></Marker>;
}

export default function ReportForm() {
  const navigate = useNavigate();
  
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  
  // --- CLOUDINARY STATE ---
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- CLOUDINARY CREDENTIALS ---
  const CLOUD_NAME = "dena84geh"; 
  const UPLOAD_PRESET = "madaraka_faults"; 

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        console.error("GPS Error:", err);
        alert("Could not get your exact location. Please ensure location permissions are allowed, or drop a pin manually.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // --- CLOUDINARY UPLOAD LOGIC ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      
      const data = await response.json();
      
      if (data.secure_url) {
        setImageUrl(data.secure_url);
      } else {
        setError("Failed to upload image. Please check your Cloudinary settings.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("An error occurred while uploading the image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!category) {
      setError("Please select a utility category.");
      return;
    }

    if (!position) {
      setError("Please drop a pin on the map to indicate the exact location of the fault.");
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError("You must be logged in to submit a report.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "tickets"), {
        residentId: currentUser.uid,
        residentEmail: currentUser.email,
        category: category,
        description: description,
        location: {
          lat: position.lat,
          lng: position.lng
        },
        // Save the image URL to Firestore if it exists
        imageUrl: imageUrl || null,
        status: "Pending",
        createdAt: serverTimestamp(),
      });

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
        
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard" className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Report a Fault</h1>
            <p className="text-slate-500 text-sm">Submit a new utility issue to the dispatch team.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            
            {error && (
              <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

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

            <div className="border-t border-slate-100 pt-8">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4" /> 3. Location & Evidence
              </h3>
              
              <div className="flex flex-col gap-8">
                
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Pinpoint Fault Location <span className="text-red-500">*</span>
                    </span>
                    <button 
                      type="button" 
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-blue-200 disabled:opacity-50"
                    >
                      {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      {isLocating ? "Locating..." : "Use My Current Location"}
                    </button>
                  </div>

                  <div className="h-96 bg-slate-100 border border-slate-300 rounded-xl overflow-hidden relative z-0 shadow-inner">
                    <MapContainer 
                      center={[-1.3100, 36.8125]} 
                      zoom={15} 
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker position={position} setPosition={setPosition} />
                    </MapContainer>
                  </div>
                  
                  <p className={`text-xs ${position ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                    {position ? "✓ Location pinned successfully" : "Click the button above or tap anywhere on the map to drop a pin."}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Upload Photo (Optional)
                  </span>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="photo-upload" 
                    className="hidden" 
                    onChange={handleImageUpload}
                  />

                  {imageUrl ? (
                    <div className="relative h-64 border border-slate-300 rounded-xl overflow-hidden">
                      <img src={imageUrl} alt="Uploaded fault" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label 
                      htmlFor="photo-upload" 
                      className={`h-48 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center flex-col transition-colors cursor-pointer ${isUploadingImage ? 'opacity-70 pointer-events-none' : 'hover:bg-slate-100 hover:border-blue-400 hover:text-blue-600 text-slate-400'}`}
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="h-8 w-8 mb-3 animate-spin text-blue-500" />
                          <span className="text-sm font-medium text-slate-600">Uploading to Cloudinary...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-8 w-8 mb-3" />
                          <span className="text-sm font-medium text-slate-600">Click to browse your files</span>
                          <span className="text-xs mt-1">Supports JPG, PNG</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

              </div>
            </div>

            <div className="pt-8 flex justify-end border-t border-slate-100">
              <button
                type="submit"
                disabled={loading || isUploadingImage}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-70 text-lg w-full sm:w-auto justify-center"
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