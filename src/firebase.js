import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInAnonymously, signOut, onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBsemzWe2LUcKhAJg9UU9N_3YNcmrphiCk",
  authDomain: "bibl-ia-fa5b1.firebaseapp.com",
  projectId: "bibl-ia-fa5b1",
  storageBucket: "bibl-ia-fa5b1.firebasestorage.app",
  messagingSenderId: "472775758204",
  appId: "1:472775758204:web:df943b09264376dca594f9",
  measurementId: "G-RB7SW3JV2X",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export const signInGoogle  = ()           => signInWithPopup(auth, googleProvider);
export const signInEmail   = (e, p)       => signInWithEmailAndPassword(auth, e, p);
export const registerEmail = (e, p)       => createUserWithEmailAndPassword(auth, e, p);
export const signInGuest   = ()           => signInAnonymously(auth);
export const logout        = ()           => signOut(auth);
export const onAuthChange  = (cb)         => onAuthStateChanged(auth, cb);

export async function loadUserData(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists()
      ? snap.data()
      : { highlights: {}, notes: {}, bookmarks: {}, shared: {} };
  } catch {
    return { highlights: {}, notes: {}, bookmarks: {}, shared: {} };
  }
}

export async function saveUserData(uid, data) {
  try { await setDoc(doc(db, 'users', uid), data); } catch {}
}
