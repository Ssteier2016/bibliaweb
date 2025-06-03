import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBsemzWe2LUcKhAJg9UU9N_3YNcmrphiCk",
  authDomain: "bibl-ia-fa5b1.firebaseapp.com",
  databaseURL: "https://bibl-ia-fa5b1-default-rtdb.firebaseio.com",
  projectId: "bibl-ia-fa5b1",
  storageBucket: "bibl-ia-fa5b1.firebasestorage.app",
  messagingSenderId: "472775758204",
  appId: "1:472775758204:web:df943b09264376dca594f9",
  measurementId: "G-RB7SW3JV2X"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc
};
