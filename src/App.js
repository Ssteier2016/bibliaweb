import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import bibleData from './data/reina_valera.json';
import concordances from './data/concordances.json';
import BibleReading from './components/BibleReading';
import Collection from './components/Collection';
import InstallPrompt from './components/InstallPrompt';
import ErrorBoundary from './ErrorBoundary';
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
} from './firebase'; // Import from firebase.js
import './App.css';
import 'react-datepicker/dist/react-datepicker.css';

function App() {
  const [selectedBook, setSelectedBook] = useState('Juan');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, verse: null });
  const [noteInput, setNoteInput] = useState({ visible: false, verse: null });
  const [prayerModal, setPrayerModal] = useState({ visible: false, verse: null });
  const [notes, setNotes] = useState({});
  const [highlightedVerses, setHighlightedVerses] = useState({});
  const [highlightSubmenu, setHighlightSubmenu] = useState(false);
  const [commentSubmenu, setCommentSubmenu] = useState(false);
  const [concordanceSubmenu, setConcordanceSubmenu] = useState(false);
  const [verseComments, setVerseComments] = useState({});
  const [loadingComment, setLoadingComment] = useState(null);
  const [loadingConcordance, setLoadingConcordance] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [customBackgroundImage, setCustomBackgroundImage] = useState('');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#000000');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [monitorCode, setMonitorCode] = useState('');
  const [monitorStatus, setMonitorStatus] = useState(false);
  const [observerUid, setObserverUid] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const contextMenuRef = useRef(null);
  const touchStartPos = useRef(null);
  const navigate = useNavigate();

  const book = bibleData.books.find(b => b.name === selectedBook);
  const chapter = book?.chapters.find(c => c.chapter === selectedChapter);
  const verses = chapter?.verses.filter(v => v.text.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const backgroundImages = [
    { name: 'Ninguna', url: '' },
    { name: 'Cielo', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },
    { name: 'Montaña', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b' },
    { name: 'Mar', url: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0' },
  ];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setMonitorCode(data.monitorCode || '');
          setMonitorStatus(data.monitorStatus || false);
          setObserverUid(data.observerUid || null);
        }
      } else {
        setUser(null);
        setMonitorCode('');
        setMonitorStatus(false);
        setObserverUid(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('bibleSettings')) || {};
    setBackgroundColor(settings.backgroundColor || '#ffffff');
    setBackgroundImage(settings.backgroundImage || '');
    setCustomBackgroundImage(settings.customBackgroundImage || '');
    setFontFamily(settings.fontFamily || 'Arial');
    setFontSize(settings.fontSize || 16);
    setTextColor(settings.textColor || '#000000');
  }, []);

  useEffect(() => {
    const settings = {
      backgroundColor,
      backgroundImage,
      customBackgroundImage,
      fontFamily,
      fontSize,
      textColor,
    };
    localStorage.setItem('bibleSettings', JSON.stringify(settings));
  }, [backgroundColor, backgroundImage, customBackgroundImage, fontFamily, fontSize, textColor]);

  useEffect(() => {
    if (user) {
      const storedNotes = {};
      const storedHighlights = {};
      const storedComments = {};
      const currentBook = bibleData.books.find(b => b.name === selectedBook);
      if (currentBook) {
        const currentChapter = currentBook.chapters.find(c => c.chapter === selectedChapter);
        if (currentChapter) {
          currentChapter.verses.forEach(verse => {
            const noteKey = `note_${selectedBook}_${selectedChapter}_${verse.verse}_${user.uid}`;
            const highlightKey = `highlight_${selectedBook}_${selectedChapter}_${verse.verse}_${user.uid}`;
            const commentKey = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${user.uid}`;
            const note = localStorage.getItem(noteKey);
            const highlight = localStorage.getItem(highlightKey);
            const comment = localStorage.getItem(commentKey);
            if (note) storedNotes[noteKey] = note;
            if (highlight) storedHighlights[highlightKey] = JSON.parse(highlight);
            if (comment) storedComments[commentKey] = JSON.parse(comment);
          });
        }
      }
      setNotes(storedNotes);
      setHighlightedVerses(storedHighlights);
      setVerseComments(storedComments);
    }
  }, [selectedBook, selectedChapter, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthOpen(false);
    } catch (error) {
      alert('Error al iniciar sesión: ' + error.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const code = Math.random().toString(36).substring(2, 10);
      await setDoc(doc(db, 'users', user.uid), {
        email,
        monitorCode: code,
        monitorStatus: false,
        observerUid: null,
      });
      setMonitorCode(code);
      setAuthOpen(false);
    } catch (error) {
      alert('Error al registrarse: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
    } catch (error) {
      alert('Error al cerrar sesión: ' + error.message);
    }
  };

  const toggleMonitor = async () => {
    if (!user) return;
    const newStatus = !monitorStatus;
    setMonitorStatus(newStatus);
    await setDoc(doc(db, 'users', user.uid), { monitorStatus: newStatus }, { merge: true });
    if (observerUid && !newStatus) {
      await addDoc(collection(db, 'alerts'), {
        observerUid,
        message: `El usuario ${email} ha desactivado el monitoreo.`,
        timestamp: new Date(),
      });
    }
  };

  const generateMonitorCode = async () => {
    if (!user) return;
    const newCode = Math.random().toString(36).substring(2, 10);
    setMonitorCode(newCode);
    await setDoc(doc(db, 'users', user.uid), { monitorCode: newCode }, { merge: true });
  };

  const revokeMonitor = async () => {
    if (!user || !observerUid) return;
    await setDoc(doc(db, 'users', user.uid), { observerUid: null }, { merge: true });
    await addDoc(collection(db, 'alerts'), {
      observerUid,
      message: `El usuario ${email} ha revocado el monitoreo.`,
      timestamp: new Date(),
    });
    setObserverUid(null);
  };

  const linkObserver = async (code) => {
    if (!user) return;
    const usersRef = collection(db, 'users');
    const snapshot = await usersRef.where('monitorCode', '==', code).get();
    if (!snapshot.empty) {
      const observer = snapshot.docs[0];
      await setDoc(doc(db, 'users', user.uid), { observerUid: observer.id }, { merge: true });
      setObserverUid(observer.id);
      alert('Observador vinculado con éxito.');
    } else {
      alert('Código inválido.');
    }
  };

  const handleContextMenu = (e, verse) => {
    if (e?.cancelable) {
      e.preventDefault();
    }
    const x = e?.clientX || (e?.touches && e.touches[0].clientX) || 0;
    const y = e?.clientY || (e?.touches && e.touches[0].clientY) || 0;
    setContextMenu({ visible: true, x, y, verse });
    setHighlightSubmenu(false);
    setCommentSubmenu(false);
    setConcordanceSubmenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, verse: null });
        setHighlightSubmenu(false);
        setCommentSubmenu(false);
        setConcordanceSubmenu(false);
        setPrayerModal({ visible: false, verse: null });
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleTouchStart = (e, verse) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    const timeout = setTimeout(() => {
      const currentTouch = e.touches[0] || touch;
      const moved = touchStartPos.current &&
        (Math.abs(currentTouch.clientX - touchStartPos.current.x) > 10 ||
         Math.abs(currentTouch.clientY - touchStartPos.current.y) > 10);
      if (!moved) {
        handleContextMenu(e, verse);
      }
    }, 2000);
    e.target.ontouchend = () => {
      clearTimeout(timeout);
      touchStartPos.current = null;
    };
  };

  const handleHighlight = (verse, color) => {
    if (!user) return;
    const key = `highlight_${selectedBook}_${selectedChapter}_${verse.verse}_${user.uid}`;
    const newHighlight = highlightedVerses[key]?.color === color ? null : { color };
    setHighlightedVerses({ ...highlightedVerses, [key]: newHighlight });
    localStorage.setItem(key, JSON.stringify(newHighlight));
    setContextMenu({ visible: false, verse: null });
    setHighlightSubmenu(false);
  };

  const toggleHighlightSubmenu = () => {
    setHighlightSubmenu(!highlightSubmenu);
    setCommentSubmenu(false);
    setConcordanceSubmenu(false);
  };

  const handleNote = (verse) => {
    setNoteInput({ visible: true, verse });
    setContextMenu({ visible: false, verse: null });
  };

  const handleNoteChange = (verse, value) => {
    if (!user) return;
    const key = `note_${selectedBook}_${selectedChapter}_${verse.verse}_${user.uid}`;
    setNotes({ ...notes, [key]: value });
    localStorage.setItem(key, value);
  };

  const closeNoteInput = () => {
    setNoteInput({ visible: false, verse: null });
  };

  const handleShare = async (verse) => {
    const text = `${selectedBook} ${selectedChapter}:${verse.verse} - ${verse.text}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Biblia', text });
      } else {
        alert('Copia: ' + text);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error al compartir:', error);
      }
    }
    setContextMenu({ visible: false, verse: null });
  };

  const handleCommentSelect = async (verse, type) => {
    if (!user) return;
    const key = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${type}_${user.uid}`;
    const cachedComment = localStorage.getItem(key);
    if (cachedComment) {
      setVerseComments({ ...verseComments, [key]: JSON.parse(cachedComment) });
      setLoadingComment(null);
      setContextMenu({ visible: false, verse: null });
      setCommentSubmenu(false);
      return;
    }
    setLoadingComment(key);
    try {
      const prompt = `
        Eres un experto en exégesis bíblica. Proporciona un comentario de tipo "${type}" para el versículo ${selectedBook} ${selectedChapter}:${verse.verse} ("${verse.text}") en español. El comentario debe ser detallado, claro, con un máximo de 100 palabras, relevante al contexto bíblico. Ejemplo:
        - Teológico: "Juan 1:1 establece la divinidad de Cristo como el Verbo eterno."
        - Geográfico: "El prólogo de Juan es universal, sin un lugar específico."
      `;
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
        {
          inputs: prompt,
          max_tokens: 200,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      let commentText = response.data?.[0]?.generated_text?.trim() || 'No se recibió comentario.';
      if (commentText.startsWith(prompt)) {
        commentText = commentText.substring(prompt.length).trim();
      }
      commentText = commentText.split(' ').slice(0, 100).join(' ');
      const comment = { type, text: commentText };
      setVerseComments({ ...verseComments, [key]: comment });
      localStorage.setItem(key, JSON.stringify(comment));
    } catch (error) {
      console.error('Error:', error);
      setVerseComments({
        ...verseComments,
        [key]: { type, text: 'Error al obtener comentario.' },
      });
    }
    setLoadingComment(null);
    setContextMenu({ visible: false, verse: null });
    setCommentSubmenu(false);
  };

  const toggleCommentSubmenu = () => {
    setCommentSubmenu(!commentSubmenu);
    setHighlightSubmenu(false);
    setConcordanceSubmenu(false);
  };

  const handleCloseComment = (verse, type) => {
    if (!user) return;
    const key = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${type}_${user.uid}`;
    const newComments = { ...verseComments };
    delete newComments[key];
    setVerseComments(newComments);
    localStorage.removeItem(key);
  };

  const toggleConcordanceSubmenu = () => {
    setConcordanceSubmenu(!concordanceSubmenu);
    setHighlightSubmenu(false);
    setCommentSubmenu(false);
  };

  const handleConcordanceSelect = (relatedVerse) => {
    setSelectedBook(relatedVerse.book);
    setSelectedChapter(relatedVerse.chapter);
    navigate('/');
    setContextMenu({ visible: false, verse: null });
    setConcordanceSubmenu(false);
  };

  const getConcordances = async (verse) => {
    const reference = `${selectedBook} ${selectedChapter}:${verse.verse}`;
    const entry = concordances.find(c => c.reference === reference);
    return entry ? entry.related : [];
  };

  const handlePrayer = (verse) => {
    setPrayerModal({ visible: true, verse });
    setContextMenu({ visible: false, verse: null });
  };

  const closePrayerModal = () => {
    setPrayerModal({ visible: false, verse: null });
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    setSettingsOpen(false);
    setAuthOpen(false);
  };

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
    setMenuOpen(false);
    setAuthOpen(false);
  };

  const toggleAuth = (e) => {
    e.preventDefault();
    setAuthOpen(!authOpen);
    setMenuOpen(false);
    setSettingsOpen(false);
  };

  const handleCustomImageApply = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target.result;
        setBackgroundImage(imageUrl);
        setBackgroundColor('#ffffff');
        setCustomBackgroundImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <ErrorBoundary>
      <div
        className="App"
        style={{
          backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily,
          fontSize: `${fontSize}px`,
          color: textColor,
        }}
      >
        <header>
          <h1>Bibl.ia</h1>
          <div className="menu-container">
            <button className="menu-button" onClick={toggleMenu} aria-label="Open menu">
              ☰
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <Link to="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
                <Link to="/reading" onClick={() => setMenuOpen(false)}>Lectura Bíblica</Link>
                <Link to="/collection" onClick={() => setMenuOpen(false)}>Colección</Link>
                <div className="menu-item" onClick={toggleSettings} aria-label="Open settings">Configuración</div>
                {user ? (
                  <>
                    <div className="menu-item" onClick={toggleMonitor}>
                      {monitorStatus ? 'Desactivar Monitoreo' : 'Activar Monitoreo'}
                    </div>
                    <div className="menu-item" onClick={generateMonitorCode}>Generar Código de Monitoreo</div>
                    <div className="menu-item" onClick={revokeMonitor}>Revocar Monitoreo</div>
                    <div className="menu-item" onClick={handleLogout}>Cerrar Sesión</div>
                  </>
                ) : (
                  <div className="menu-item" onClick={toggleAuth}>Iniciar Sesión / Registrarse</div>
                )}
              </div>
            )}
          </div>
        </header>
        {authOpen && (
          <div className="auth-modal">
            <div className="auth-content">
              <h2>Autenticación</h2>
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="email">Correo:</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Contraseña:</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit">Iniciar Sesión</button>
              </form>
              <button type="button" onClick={handleRegister}>Registrarse</button>
              <button type="button" onClick={() => setAuthOpen(false)}>Cerrar</button>
            </div>
          </div>
        )}
        {settingsOpen && (
          <div className="settings-modal">
            <div className="settings-content">
              <h2>Configuración</h2>
              <div className="settings-item">
                <label htmlFor="backgroundColor">Color de fondo:</label>
                <input
                  type="color"
                  id="backgroundColor"
                  value={backgroundColor}
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    setBackgroundImage('');
                    setCustomBackgroundImage('');
                  }}
                />
              </div>
              <div className="settings-item">
                <label htmlFor="backgroundImage">Imagen de fondo:</label>
                <select
                  id="backgroundImage"
                  value={backgroundImage}
                  onChange={(e) => {
                    setBackgroundImage(e.target.value);
                    setBackgroundColor('');
                    setCustomBackgroundImage('');
                  }}
                >
                  {backgroundImages.map((img) => (
                    <option key={img.url} value={img.url}>{img.name}</option>
                  ))}
                </select>
              </div>
              <div className="settings-item">
                <label htmlFor="customBackgroundImage">Subir fondo personalizado:</label>
                <input
                  type="file"
                  id="customBackgroundImage"
                  onChange={handleCustomImageApply}
                  accept="image/*"
                />
              </div>
              <div className="settings-item">
                <label htmlFor="fontFamily">Tipografía:</label>
                <select
                  id="familyName"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  <option value="Arial">Arial</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lora">Lora</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </div>
              <div className="settings-item">
                <label htmlFor="fontSize">Tamaño de letra:</label>
                <input
                  type="range"
                  id="fontSize"
                  min="0"
                  max="0"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
                <span>{fontSize}px</span>
              </div>
              <div className="settings-item">
                <label htmlFor="textColor">Color de letra:</label>
                <input
                  type="color"
                  id="textColor"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                />
              </div>
              {user && (
                <div className="settings-item">
                  <label htmlFor="monitorCode">Código de monitoreo:</label>
                  <input
                    type="text"
                    id="monitorCode"
                    value={monitorCode}
                    disabled
                  />
                  <button type="button" onClick={() => navigator.clipboard.writeText(monitorCode)}>
                    Copiar Código
                  </button>
                  <label htmlFor="linkObserver">Vincular observador:</label>
                  <input
                    type="text"
                    id="linkObserver"
                    placeholder="Ingresa el código del observador"
                    onChange={(e) => linkObserver(e.target.value)}
                  >
                />
              </div>
            )}
            <button className="close-settings" onClick={() => setSettingsOpen(false)}>
              Cerrar
            </button>
          </div>
        )}
        <InstallPrompt />
        <Routes>
          <Route
            path="/>
            element={
              <div className="main-content">
                <div className="selector">
                  <div className="selector">
                    <select value="value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)}>
                      {bibleData.books.map((book) => (
                        <option key="key={book.name}" value={book.name}>{book.title}</option>
                      ))}
                    </select>
                    <select value={selectedChapter} onChange={(e) => setSelectedChapter(Number(e.target.value))}>
                      {book?.chapters.map((chapter) => (
                        <option key={chapter.chapter} value={chapter.chapter}>{chapter.title}></option>
                      ))}
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Search verses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="continuous-text">
                  {verses.map((verse) => {
                    const highlightKey = verseData_${selectedBook}_${selectedChapter}_${verse.verse}_${user?.uid || ''guest_uid''};
                    const highlightKey = `highlight_${selectedBook}_${selectedChapter}_${verse.verse}_${user?.uid || 'guest'}`;
                    const noteKey = note_${selectedBook}_${selectedChapter}_${verse.verse}_${user?.uid || ''guest_uid''};
                    const noteKey = `note_${selectedBook}_${selectedChapter}_${verse.verse}_${user?.uid || 'guest'}`;
                    const commentKey = comment_${selectedBook}_${selectedChapter}_${verse.verse}_${verseComments?.[comment_${verse.verse}_${selectedChapter}_${selectedBook}_type_${user?.uid || ''guest_uid''}_type${user?.uid || 'guest'}_type}]?.type || ''unknown_type''}_${user?.uid || ''guest_uid''};
                    const commentKey = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${verseComments?.[`comment_${verse.verse}_${selectedChapter}_${selectedBook}_type_${user?.uid || 'guest'}_type`]?.type || 'unknown'}_${user?.uid || 'guest'}`;
                    return (
                      <span
                        key={verse.verse}
                        key={verse.key}
                        className={`verse ${highlightedVerses[highlightKey]?.color ? `highlighted-${highlightedVerses[highlightKey].color}` : ''}`}
                        onContextMenu={(e) => handleContextMenu(e, verse)}
                        onTouchStart={(e) => handleTouchStart(e, verse)}
                      >
                        <span className="verse-number">{verse.number}</span>
                        <span className="verse-text">{verse.text} </span>
                        {verseComments[commentKey]?.text && (
                          <span className="comment-wrapper">
                            <span className="comment">
                              Comentario {verseComments[commentKey].type}: {verseComments[commentKey].text}
                              {loadingComment === commentKey && ' (Cargando...)'}
                            </span>
                            <button className="close-comment" onClick={() => handleCloseComment(verse, verseComments[commentKey]?.type)}>X</button>
                          </span>
                        )}
                        {notes[noteKey] && (
                          <span className="note">Nota: {notes[noteKey]}</span>
                        )}
                        {noteInput?.visible && noteInput?.verse?.verse === verse.verse && (
                          <div className="note-input">
                            <textarea
                              placeholder="Write your note..."
                              defaultValue={notes[noteKey] || ''}
                              onChange={(e) => handleNoteChange(verse, (e.target.value)}
                              autoFocus
                            />
                            <button className="close-note" onClick={closeNoteInput}>X</button>
                          </div>
                        )}
                      </span>
                    );
                  })}
                </div>
                {contextMenu.visible && (
                  <div
                    className="context-menu"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    ref={contextMenuRef}
                  >
                    <div className="menu-item" onClick={toggleHighlightSubmenu}>
                      Subrayar
                      {highlightSubmenu && (
                        <div className="submenu">
                          <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'yellow')}>
                            Amarillo
                          </div>
                          <div className="submenu-item">
                            Verde
                            </div>
                            </>
                          ))}
                        </div>
                      })}
                    </div>
                    <div className="menu-item" onClick={() => handleNote(contextMenu.verse)}>
                      Anotar
                    </div>
                    <div className="menu-item" onClick={() => handleShare(contextMenu.verse)}>
                      Compartir
                    </div>
                    <div className="menu-item" onClick={toggleCommentSubmenu}>
                      Comentario
                      {commentSubmenu && (
                        <div className="submenu">
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'lingüístico')}>
                            Lingüística
                          </div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'cultural')}>
                            Cultural
                          </div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'histórico')}>
                            Histórica
                          </div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'teológico')}>
                            Teológica
                          </div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'geográfico')}>
                            Geográfica
                          </div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'paleolítico')}>
                            Paleolítica
                          </div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'arqueológico')}>
                            Arqueológica
                          </div>
                        </div>
                      })}
                    </div>
                    <div className="menu-item" onClick={toggleConcordanceSubmenu}>
                      Concordancia
                      {concordanceSubmenu && (
                        <div className="submenu">
                          {loadingConcordance ? (
                            <div className="submenu-item">Cargando...</div>
                          ) : (
                            getConcordances(contextMenu.verse).then(related =>
                              related.length === 0 ? (
                                <div className="submenu-item">No hay concordancias</div>
                              ) : (
                                related.map((rel, index) => (
                                  <div
                                    key={index}
                                    className="submenu-item"
                                    onClick={() => handleConcordanceSelect(rel)}
                                  >
                                    {rel.book} {rel.chapter}:{rel.verse}
                                  </div>
                                ))
                              )
                            )
                          )}
                        </div>
                      })}
                    </div>
                    <div className="menu-item" onClick={() => handlePrayer(contextMenu.verse)}>
                      Orar
                    </div>
                  </div>
                })}
              </div>
            }
          />
          <Route
            path="/reading"
            element={
              <BibleReading
                bibleData={bibleData}
                concordances={concordances}
                handleContextMenu={handleContextMenu}
                handleTouchStart={handleTouchStart}
                handleHighlight={handleHighlight}
                toggleHighlightSubmenu={toggleHighlightSubmenu}
                handleNote={handleNote}
                handleNoteChange={handleNoteChange}
                closeNoteInput={closeNoteInput}
                handleShare={handleShare}
                handleCommentSelect={handleCommentSelect}
                toggleCommentSubmenu={toggleCommentSubmenu}
                handleCloseComment={handleCloseComment}
                toggleConcordanceSubmenu={toggleConcordanceSubmenu}
                handleConcordanceSelect={handleConcordanceSelect}
                getConcordances={getConcordances}
                handlePrayer={handlePrayer}
                closePrayerModal={closePrayerModal}
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                noteInput={noteInput}
                setNoteInput={setNoteInput}
                modal={modal}
                setPrayerModal={setPrayerModal}
                notes={notes}
                setNotes={setNotes}
                highlightedVerses={highlightedVerses}
                setHighlightedVerses={setHighlightedVerses}
                highlightSubmenu={highlightSubmenu}
                setHighlightSubmenu={setHighlightSubmenu}
                commentSubmenu={commentSubmenu}
                setCommentSubmenu={setCommentSubmenu}
                concordanceSubmenu={concordanceSubmenu}
                setConcordanceSubmenu={setConcordanceSubmenu}
                verseComments={verseComments}
                setVerseComments={setVerseComments}
                loadingComment={loadingComment}
                setLoadingComment={setLoadingComment}
                loadingConcordance={loadingConcordance}
                setLoadingConcordance={setLoadingConcordance}
                contextMenuRef={contextMenuRef}
                backgroundColor={backgroundColor}
                backgroundImage={backgroundImage}
                fontFamily={fontFamily}
                fontSize={fontSize}
                textColor={textColor}
                userId={user?.uid || null}
              />
            )}
          />
          <Route path="/collection" element={<Collection />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
