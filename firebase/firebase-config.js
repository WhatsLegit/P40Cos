// Firebase Configuration
// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDj3Dq3uE4NEnxjhpolW_wC9rtXjDuYciI",
  authDomain: "p40cosmetics-f9616.firebaseapp.com",
  projectId: "p40cosmetics-f9616",
  storageBucket: "p40cosmetics-f9616.firebasestorage.app",
  messagingSenderId: "1020692803481",
  appId: "1:1020692803481:web:b86c7c677778b065892d08",
  measurementId: "G-D2C7XL91LW"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Keep auth session alive across page refreshes
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Export for use in other files
window.auth = auth;
window.db = db;
window.storage = storage;