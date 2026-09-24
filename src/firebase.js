import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  where,
  query,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Object.values(firebaseConfig).every(Boolean);
export const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "";
export const whatsappNumber =
  import.meta.env.VITE_WHATSAPP_NUMBER || "5492645786134";

const app = firebaseReady ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const provider = new GoogleAuthProvider();

export {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDownloadURL,
  onAuthStateChanged,
  onSnapshot,
  query,
  ref,
  serverTimestamp,
  signInWithPopup,
  signOut,
  updateDoc,
  uploadBytes,
  where,
};
