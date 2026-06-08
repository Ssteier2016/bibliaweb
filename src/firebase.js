import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInAnonymously, signOut, onAuthStateChanged, updateProfile,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, arrayUnion, arrayRemove, onSnapshot, increment,
} from 'firebase/firestore';

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
export const db      = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});


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

// Guarda solo los campos de lectura bíblica (reemplaza mapas enteros para eliminar claves borradas)
export async function saveUserData(uid, data) {
  try {
    await updateDoc(doc(db, 'users', uid), data);
  } catch {
    try { await setDoc(doc(db, 'users', uid), data, { merge: true }); } catch {}
  }
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

// ── Foto de perfil (base64 comprimida en Firestore) ─────────────

function compressToBase64(file, maxSize = 200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      function attempt(size, q) {
        const scale  = Math.min(size / img.width, size / img.height, 1);
        const w      = Math.round(img.width  * scale);
        const h      = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const data = canvas.toDataURL('image/jpeg', q);
        if (data.length > 700_000) {
          if (q > 0.35) return attempt(size, Math.round((q - 0.15) * 100) / 100);
          if (size > 100) return attempt(Math.round(size * 0.7), 0.6);
        }
        return data;
      }
      resolve(attempt(maxSize, quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function saveProfilePhotoURL(uid, url) {
  try {
    try { if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url }); } catch {}
    await setDoc(doc(db, 'users', uid), { photoURL: url }, { merge: true });
    return url;
  } catch (e) { console.error('Error guardando URL de foto:', e); return null; }
}

export async function uploadProfilePhoto(uid, file) {
  try {
    const base64 = await compressToBase64(file);
    // Firebase Auth limita photoURL a 2048 chars — base64 lo supera, se ignora el error
    try { if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: base64 }); } catch {}
    await setDoc(doc(db, 'users', uid), { photoURL: base64 }, { merge: true });
    return base64;
  } catch (e) { console.error('Error guardando foto:', e); return null; }
}

// ── Fotos de autores teológicos (solo admin) ────────────────────

export const ADMIN_EMAIL = 'rodrigo.n.arena@hotmail.com';

export async function loadAuthorPhotos() {
  try {
    const snap = await getDoc(doc(db, 'adminConfig', 'authorPhotos'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

export async function saveAuthorPhoto(authorId, file) {
  try {
    const base64 = await compressToBase64(file, 280, 0.82);
    await setDoc(doc(db, 'adminConfig', 'authorPhotos'), { [authorId]: base64 }, { merge: true });
    return base64;
  } catch (e) {
    console.error('Error guardando foto de autor:', e);
    if (e.code === 'permission-denied') return 'PERMISSION_DENIED';
    return null;
  }
}

export async function saveAuthorPhotoURL(authorId, url) {
  try {
    await setDoc(doc(db, 'adminConfig', 'authorPhotos'), { [authorId]: url }, { merge: true });
    return url;
  } catch (e) {
    console.error('Error guardando URL de autor:', e);
    if (e.code === 'permission-denied') return 'PERMISSION_DENIED';
    return null;
  }
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

// ── Feed social ───────────────────────────────────────────────────────────────

export async function createPost(uid, displayName, photoURL, text, verseRef, repostOf = null) {
  const data = {
    uid,
    displayName: displayName || 'Usuario',
    photoURL: photoURL || '',
    text,
    verseRef,
    timestamp: serverTimestamp(),
    likes: [],
    dislikes: [],
    reposts: 0,
  };
  if (repostOf) data.repostOf = repostOf;
  try { await addDoc(collection(db, 'posts'), data); } catch (e) { console.error(e); }
}

export async function togglePostLike(postId, uid, isLiked, isDisliked) {
  const updates = isLiked
    ? { likes: arrayRemove(uid) }
    : { likes: arrayUnion(uid), ...(isDisliked ? { dislikes: arrayRemove(uid) } : {}) };
  try { await updateDoc(doc(db, 'posts', postId), updates); } catch {}
}

export async function togglePostDislike(postId, uid, isLiked, isDisliked) {
  const updates = isDisliked
    ? { dislikes: arrayRemove(uid) }
    : { dislikes: arrayUnion(uid), ...(isLiked ? { likes: arrayRemove(uid) } : {}) };
  try { await updateDoc(doc(db, 'posts', postId), updates); } catch {}
}

export async function repostPost(postId, uid, displayName, photoURL, originalPost) {
  try {
    await updateDoc(doc(db, 'posts', postId), { reposts: increment(1) });
    await createPost(uid, displayName, photoURL, originalPost.text, originalPost.verseRef, {
      id: postId,
      uid: originalPost.uid,
      displayName: originalPost.displayName,
      photoURL: originalPost.photoURL || '',
    });
  } catch {}
}

export function subscribeToPosts(callback) {
  const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addPostComment(postId, uid, displayName, photoURL, text) {
  try {
    await addDoc(collection(db, 'posts', postId, 'comments'), {
      uid, displayName: displayName || 'Usuario', photoURL: photoURL || '',
      text, timestamp: serverTimestamp(),
    });
  } catch {}
}

export function subscribeToPostComments(postId, callback) {
  const q = query(collection(db, 'posts', postId, 'comments'), orderBy('timestamp', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function deletePost(postId, uid) {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'posts', postId));
    if (snap.exists() && snap.data().uid === uid) {
      await deleteDoc(doc(db, 'posts', postId));
    }
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
