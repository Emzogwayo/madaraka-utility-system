// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCReY3q16xv34cC7db4QDzaKx4Ez0PZvG0",
  authDomain: "madaraka-utility-system.firebaseapp.com",
  projectId: "madaraka-utility-system",
  storageBucket: "madaraka-utility-system.firebasestorage.app",
  messagingSenderId: "383518085395",
  appId: "1:383518085395:web:662d895f8e34fb85810ae6",
  measurementId: "G-S1JX78Z1BS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export the services so we can use them in our pages
export const auth = getAuth(app);
export const db = getFirestore(app);