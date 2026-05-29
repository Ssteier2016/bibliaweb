import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInAnonymously, signOut, onAuthStateChanged, updateProfile,
} from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, arrayUnion, arrayRemove, onSnapshot, increment,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();

export const signInGoogle  = ()      => signInWithPopup(auth, googleProvider);
export const signInEmail   = (e, p)  => signInWithEmailAndPassword(auth, e, p);
export const registerEmail = (e, p)  => createUserWithEmailAndPassword(auth, e, p);
export const signInGuest   = ()      => signInAnonymously(auth);
export const logout        = ()      => signOut(auth);
export const onAuthChange  = (cb)    => onAuthStateChanged(auth, cb);

// ── Datos del usuario ──────────────────────────────────────────

export async function loadUserData(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists()
      ? snap.data()
      : { highlights: {}, notes: {}, bookmarks: {}, shared: {}, following: [] };
  } catch {
    return { highlights: {}, notes: {}, bookmarks: {}, shared: {}, following: [] };
  }
}

// Guarda solo los campos de lectura bíblica (merge para no pisar perfil)
export async function saveUserData(uid, data) {
  try { await setDoc(doc(db, 'users', uid), data, { merge: true }); } catch {}
}

// Guarda/actualiza perfil y presencia
export async function savePresence(uid, profileData) {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...profileData,
      lastSeen: serverTimestamp(),
    }, { merge: true });
  } catch {}
}

// ── Nombre de perfil editable ──────────────────────────────────

export async function updateUserDisplayName(displayName) {
  try {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName });
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName });
    }
  } catch {}
}

// ── Comentarios públicos ───────────────────────────────────────

export async function loadComments(verseKey) {
  try {
    const ref = collection(db, 'comments', verseKey, 'entries');
    const q   = query(ref, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

export async function addComment(verseKey, uid, displayName, photoURL, text) {
  await addDoc(collection(db, 'comments', verseKey, 'entries'), {
    uid, displayName: displayName || 'Usuario', photoURL: photoURL || '',
    text, timestamp: serverTimestamp(),
  });
}

export async function deleteComment(verseKey, commentId) {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'comments', verseKey, 'entries', commentId));
  } catch {}
}

// ── Racha de lectura ───────────────────────────────────────────

export async function updateReadingStreak(uid, currentStreak = 0, lastReadDate = '') {
  const today     = new Date().toISOString().split('T')[0];
  if (lastReadDate === today) return currentStreak;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = lastReadDate === yesterday ? currentStreak + 1 : 1;
  try { await updateDoc(doc(db, 'users', uid), { streak: newStreak, lastReadDate: today }); } catch {}
  return newStreak;
}

// ── Privacidad ──────────────────────────────────────────────────

export async function updatePrivacy(uid, privacy) {
  try { await setDoc(doc(db, 'users', uid), { privacy }, { merge: true }); } catch {}
}

// ── Perfil público ──────────────────────────────────────────────

export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { uid, ...snap.data() } : null;
  } catch { return null; }
}

// ── Foto de perfil ──────────────────────────────────────────────

export async function uploadProfilePhoto(uid, file) {
  try {
    const storageRef = ref(storage, `profilePhotos/${uid}/avatar`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url });
    await setDoc(doc(db, 'users', uid), { photoURL: url }, { merge: true });
    return url;
  } catch (e) { console.error('Error subiendo foto:', e); return null; }
}

// ── Seguir / dejar de seguir ────────────────────────────────────

export async function followUser(myUid, targetUid) {
  try {
    await updateDoc(doc(db, 'users', myUid),    { following:  arrayUnion(targetUid) });
    await updateDoc(doc(db, 'users', targetUid), { followers: arrayUnion(myUid) });
  } catch {}
}

export async function unfollowUser(myUid, targetUid) {
  try {
    await updateDoc(doc(db, 'users', myUid),    { following:  arrayRemove(targetUid) });
    await updateDoc(doc(db, 'users', targetUid), { followers: arrayRemove(myUid) });
  } catch {}
}

// ── Admin / usuarios ────────────────────────────────────────────

export async function getAllUsers() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch { return []; }
}

// ── Corazones por versículo ──────────────────────────────────────

export async function incrementLike(verseKey) {
  try {
    await setDoc(doc(db, 'likes', verseKey), { count: increment(1) }, { merge: true });
  } catch {}
}

export async function loadChapterLikes(bookName, chapterNum, verses) {
  try {
    const keys  = verses.map(v => `${bookName}_${chapterNum}_${v.verse}`);
    const snaps = await Promise.all(keys.map(k => getDoc(doc(db, 'likes', k))));
    const result = {};
    snaps.forEach((snap, i) => {
      if (snap.exists()) {
        const count = snap.data().count || 0;
        if (count > 0) result[keys[i]] = count;
      }
    });
    return result;
  } catch { return {}; }
}

// ── Chat entre amigos ────────────────────────────────────────────

export function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export async function sendMessage(chatId, uid, displayName, photoURL, text) {
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    uid,
    displayName: displayName || 'Usuario',
    photoURL:    photoURL    || '',
    text,
    timestamp: serverTimestamp(),
  });
}

export function subscribeToChat(chatId, callback) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc'),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
