// ============================================================
// FIREBASE CONFIGURATION - P40 COSMETICS
// ============================================================
// SETUP GUIDE:
// 1. Go to https://console.firebase.google.com
// 2. Click "Add project" → name it "p40-cosmetics"
// 3. Enable Google Analytics (optional)
// 4. Go to Project Settings → General → Your apps → Web app
// 5. Register app, copy the config below and replace values
// 6. Enable Authentication: Auth → Sign-in method → Email/Password
// 7. Create Firestore: Firestore Database → Create database (production mode)
// 8. Enable Storage: Storage → Get started
// 9. Deploy: firebase init → firebase deploy

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ⚠️ REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDHdymkZV6hKvaEzEQgrQiReAfOkJYQkcQ",
  authDomain: "p40cosmetics-5fff8.firebaseapp.com",
  projectId: "p40cosmetics-5fff8",
  storageBucket: "p40cosmetics-5fff8.firebasestorage.app",
  messagingSenderId: "280645389672",
  appId: "1:280645389672:web:1a9fe556eff600f543dadd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ADMIN EMAIL - change to your admin email
export const ADMIN_EMAIL = "admin@p40cosmetics.com";

// WHATSAPP
export const WHATSAPP_NUMBER = "233530737048";
export const PHONE_1 = "0530737048";
export const PHONE_2 = "0534245090";
