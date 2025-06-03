import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import bibleData from './data/reina_valera.json';
import concordances from './data/concordances.json';
import BibleReading from './components/BibleReading';
import Collection from './components/Collection';
import ContentFilter from './components/ContentFilter';
import ErrorBoundary from './ErrorBoundary';
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
  const contextMenuRef = useRef(null);
  const touchStartPos = useRef(null);
  const navigate = useNavigate();

  const book = bibleData.books.find(b => b.name === selectedBook);
  const chapter = book?.chapters.find(c => c.chapter === selectedChapter);
  const verses = chapter?.verses.filter(v => v.text.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const backgroundImages = [
    { name: 'Ninguna', url: '' },
    { name: 'Cielo', url: '/assets/backgrounds/sky.jpg' },
    { name: 'Montaña', url: '/assets/backgrounds/mountain.jpg' },
    { name: 'Mar', url: '/assets/backgrounds/sea.jpg' },
  ];

  // Cargar configuraciones desde localStorage
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('bibleSettings')) || {};
    setBackgroundColor(settings.backgroundColor || '#ffffff');
    setBackgroundImage(settings.backgroundImage || '');
    setCustomBackgroundImage(settings.customBackgroundImage || '');
    setFontFamily(settings.fontFamily || 'Arial');
    setFontSize(settings.fontSize || 16);
    setTextColor(settings.textColor || '#000000');
  }, []);

  // Guardar configuraciones en localStorage
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

  // Cargar notas, resaltados y comentarios optimizado
  useEffect(() => {
    const storedNotes = {};
    const storedHighlights = {};
    const storedComments = {};
    if (book && chapter) {
      chapter.verses.forEach(verse => {
        const noteKey = `note_${selectedBook}_${selectedChapter}_${verse.verse}`;
        const highlightKey = `highlight_${selectedBook}_${selectedChapter}_${verse.verse}`;
        const commentKey = `comment_${selectedBook}_${selectedChapter}_${verse.verse}`;
        const note = localStorage.getItem(noteKey);
        const highlight = localStorage.getItem(highlightKey);
        const comment = localStorage.getItem(commentKey);
        if (note) storedNotes[noteKey] = note;
        if (highlight) storedHighlights[highlightKey] = JSON.parse(highlight);
        if (comment) storedComments[commentKey] = JSON.parse(comment);
      });
      setNotes(storedNotes);
      setHighlightedVerses(storedHighlights);
      setVerseComments(storedComments);
    }
  }, [selectedBook, selectedChapter]);

  // Validar clave API
  useEffect(() => {
    if (!process.env.REACT_APP_HF_API_KEY) {
      console.warn('Hugging Face API key is missing. Comment and concordance features may not work.');
    }
  }, []);

  const handleContextMenu = useCallback((e, verse) => {
    if (e?.cancelable) {
      e.preventDefault();
    }
    const x = e?.clientX || (e?.touches && e.touches[0].clientX) || 0;
    const y = e?.clientY || (e?.touches && e.touches[0].clientY) || 0;
    setContextMenu({ visible: true, x, y, verse });
    setHighlightSubmenu(false);
    setCommentSubmenu(false);
    setConcordanceSubmenu(false);
  }, []);

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

  const handleTouchStart = useCallback((e, verse) => {
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
  }, [handleContextMenu]);

  const handleHighlight = useCallback((verse, color) => {
    const key = `highlight_${selectedBook}_${selectedChapter}_${verse.verse}`;
    const newHighlight = highlightedVerses[key]?.color === color ? null : { color };
    setHighlightedVerses(prev => ({ ...prev, [key]: newHighlight }));
    localStorage.setItem(key, JSON.stringify(newHighlight));
    setContextMenu({ visible: false, verse: null });
    setHighlightSubmenu(false);
  }, [selectedBook, selectedChapter, highlightedVerses]);

  const toggleHighlightSubmenu = useCallback(() => {
    setHighlightSubmenu(prev => !prev);
    setCommentSubmenu(false);
    setConcordanceSubmenu(false);
  }, []);

  const handleNote = useCallback((verse) => {
    setNoteInput({ visible: true, verse });
    setContextMenu({ visible: false, verse: null });
  }, []);

  const handleNoteChange = useCallback((verse, value) => {
    const key = `note_${selectedBook}_${selectedChapter}_${verse.verse}`;
    setNotes(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(key, value);
  }, [selectedBook, selectedChapter]);

  const closeNoteInput = useCallback(() => {
    setNoteInput({ visible: false, verse: null });
  }, []);

  const handleShare = useCallback(async (verse) => {
    const text = `${selectedBook} ${selectedChapter}:${verse.verse} - ${verse.text}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Biblia Web', text });
      } else {
        navigator.clipboard.writeText(text);
        alert('Versículo copiado al portapapeles: ' + text);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error al compartir:', error);
        alert('Error al compartir. Versículo copiado: ' + text);
        navigator.clipboard.writeText(text);
      }
    }
    setContextMenu({ visible: false, verse: null });
  }, [selectedBook, selectedChapter]);

  const handleCommentSelect = useCallback(async (verse, type) => {
    const key = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${type}`;
    const cachedComment = localStorage.getItem(key);
    if (cachedComment) {
      setVerseComments(prev => ({ ...prev, [key]: JSON.parse(cachedComment) }));
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
            'Authorization': `Bearer ${process.env.REACT_APP_HF_API_KEY || ''}`,
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true',
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
      setVerseComments(prev => ({ ...prev, [key]: comment }));
      localStorage.setItem(key, JSON.stringify(comment));
    } catch (error) {
      console.error('Error fetching comment:', error);
      let errorMessage = 'Error al obtener el comentario. Verifica tu conexión o la clave API.';
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Error de red: No se pudo conectar con Hugging Face.';
      } else if (error.response) {
        errorMessage = `Error ${error.response.status}: ${error.response.data?.error || 'Error desconocido'}`;
      }
      setVerseComments(prev => ({
        ...prev,
        [key]: { type, text: errorMessage }
      }));
    }
    setLoadingComment(null);
    setContextMenu({ visible: false, verse: null });
    setCommentSubmenu(false);
  }, [selectedBook, selectedChapter]);

  const generateConcordance = useCallback(async (verse) => {
    const reference = `${selectedBook} ${selectedChapter}:${verse.verse}`;
    const key = `concordance_${reference}`;
    const cachedConcordance = localStorage.getItem(key);
    if (cachedConcordance) {
      return JSON.parse(cachedConcordance);
    }
    setLoadingConcordance(reference);
    try {
      const prompt = `
        Eres un experto en estudios bíblicos. Proporciona hasta 3 referencias cruzadas (concordancias) para el versículo ${selectedBook} ${selectedChapter}:${verse.verse} ("${verse.text}") en la Biblia. Cada referencia debe incluir libro, capítulo, versículo y un fragmento breve del texto (máximo 20 palabras). Responde solo con un array JSON de ejemplos:
        [
          {"book": "Génesis", "chapter": 1, "verse": 1, "text": "En el principio creó Dios..."},
          {"book": "Colosenses", "chapter": 1, "verse": 16, "text": "Porque en él fueron creadas..."}
        ]
      `;
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
        {
          inputs: prompt,
          max_tokens: 300,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_HF_API_KEY || ''}`,
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true',
          },
          timeout: 30000,
        }
      );
      let concordanceText = response.data?.[0]?.generated_text?.trim() || '[]';
      let related = [];
      try {
        related = JSON.parse(concordanceText);
        if (!Array.isArray(related)) throw new Error('Invalid format');
      } catch (e) {
        console.error('Invalid concordance response:', concordanceText);
        related = [];
      }
      if (related.length > 0) {
        localStorage.setItem(key, JSON.stringify(related));
      }
      setLoadingConcordance(null);
      return related;
    } catch (error) {
      console.error('Error generating concordance:', error);
      setLoadingConcordance(null);
      return [];
    }
  }, [selectedBook, selectedChapter]);

  const toggleCommentSubmenu = useCallback(() => {
    setCommentSubmenu(prev => !prev);
    setHighlightSubmenu(false);
    setConcordanceSubmenu(false);
  }, []);

  const handleCloseComment = useCallback((verse, type) => {
    const key = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${type}`;
    setVerseComments(prev => {
      const newComments = { ...prev };
      delete newComments[key];
      return newComments;
    });
    localStorage.removeItem(key);
  }, [selectedBook, selectedChapter]);

  const toggleConcordanceSubmenu = useCallback(() => {
    setConcordanceSubmenu(prev => !prev);
    setHighlightSubmenu(false);
    setCommentSubmenu(false);
  }, []);

  const handleConcordanceSelect = useCallback((relatedVerse) => {
    setSelectedBook(relatedVerse.book);
    setSelectedChapter(relatedVerse.chapter);
    navigate('/');
    setContextMenu({ visible: false, verse: null });
    setConcordanceSubmenu(false);
  }, [navigate]);

  const getConcordances = useCallback(async (verse) => {
    const reference = `${selectedBook} ${selectedChapter}:${verse.verse}`;
    const entry = concordances.concordances.find(c => c.reference === reference);
    if (entry) return entry.related;
    const generated = await generateConcordance(verse);
    return generated;
  }, [selectedBook, selectedChapter, generateConcordance]);

  const handlePrayer = useCallback((verse) => {
    setPrayerModal({ visible: true, verse });
    setContextMenu({ visible: false, verse: null });
  }, []);

  const closePrayerModal = useCallback(() => {
    setPrayerModal({ visible: false, verse: null });
  }, []);

  const toggleMenu = useCallback(() => {
    setMenuOpen(prev => !prev);
    setSettingsOpen(false);
  }, []);

  const toggleSettings = useCallback(() => {
    setSettingsOpen(prev => !prev);
    setMenuOpen(false);
  }, []);

  const handleCustomImageApply = useCallback(() => {
    if (customBackgroundImage) {
      setBackgroundImage(customBackgroundImage);
      setBackgroundColor('#ffffff');
    }
  }, [customBackgroundImage]);

  // Manejo de errores para imágenes de fondo
  const handleImageError = (e) => {
    console.warn('Error loading background image:', e.target.src);
    setBackgroundImage('');
    setBackgroundColor('#ffffff');
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
          <h1>Bibl-ia</h1>
          <div className="menu-container">
            <button
              className="menu-button"
              onClick={toggleMenu}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
            >
              ☰
            </button>
            {menuOpen && (
              <nav className="dropdown-menu" role="navigation">
                <Link to="/" onClick={toggleMenu}>Inicio</Link>
                <Link to="/reading" onClick={toggleMenu}>Lectura Bíblica</Link>
                <Link to="/collection" onClick={toggleMenu}>Colección</Link>
                <Link to="/filter" onClick={toggleMenu}>Filtro de Bienestar</Link>
                <button
                  className="menu-item"
                  onClick={toggleSettings}
                  aria-label="Abrir configuración"
                >
                  Configuración
                </button>
              </nav>
            )}
          </div>
        </header>
        {settingsOpen && (
          <div className="settings-modal" role="dialog" aria-labelledby="settings-title">
            <div className="settings-content">
              <h2 id="settings-title">Configuración</h2>
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
                  aria-label="Seleccionar color de fondo"
                />
              </div>
              <div className="settings-item">
                <label htmlFor="backgroundImage">Imagen de fondo:</label>
                <select
                  id="backgroundImage"
                  value={backgroundImage}
                  onChange={(e) => {
                    setBackgroundImage(e.target.value);
                    setBackgroundColor('#ffffff');
                    setCustomBackgroundImage('');
                  }}
                  aria-label="Seleccionar imagen de fondo"
                >
                  {backgroundImages.map((img) => (
                    <option key={img.url} value={img.url}>{img.name}</option>
                  ))}
                </select>
              </div>
              <div className="settings-item">
                <label htmlFor="customBackgroundImage">URL de imagen personalizada:</label>
                <input
                  type="text"
                  id="customBackgroundImage"
                  value={customBackgroundImage}
                  onChange={(e) => setCustomBackgroundImage(e.target.value)}
                  placeholder="Pega la URL de una imagen"
                  aria-label="Ingresar URL de imagen personalizada"
                />
                <button
                  onClick={handleCustomImageApply}
                  disabled={!customBackgroundImage}
                  aria-label="Aplicar imagen personalizada"
                >
                  Aplicar URL
                </button>
              </div>
              <div className="settings-item">
                <label htmlFor="fontFamily">Tipografía:</label>
                <select
                  id="fontFamily"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  aria-label="Seleccionar tipografía"
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
                  min="12"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  aria-label="Ajustar tamaño de letra"
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
                  aria-label="Seleccionar color de letra"
                />
              </div>
              <button
                className="close-settings"
                onClick={toggleSettings}
                aria-label="Cerrar configuración"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
        <Routes>
          <Route
            path="/"
            element={
              <main className="main-content" role="main">
                <div className="selector">
                  <select
                    value={selectedBook}
                    onChange={(e) => setSelectedBook(e.target.value)}
                    aria-label="Seleccionar libro de la Biblia"
                  >
                    {bibleData.books.map(book => (
                      <option key={book.name} value={book.name}>{book.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(Number(e.target.value))}
                    aria-label="Seleccionar capítulo"
                  >
                    {book?.chapters.map(chapter => (
                      <option key={chapter.chapter} value={chapter.chapter}>{chapter.chapter}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Buscar versículos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Buscar versículos"
                />
                <div className="continuous-text">
                  {verses.map((verse) => {
                    const highlightKey = `highlight_${selectedBook}_${selectedChapter}_${verse.verse}`;
                    const noteKey = `note_${selectedBook}_${selectedChapter}_${verse.verse}`;
                    const commentKey = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${verseComments[`comment_${selectedBook}_${selectedChapter}_${verse.verse}_type`]?.type || 'unknown'}`;
                    const prayerKey = `prayer_${selectedBook}_${selectedChapter}_${verse.verse}`;
                    return (
                      <span
                        key={verse.verse}
                        className={`verse ${highlightedVerses[highlightKey] ? `highlighted-${highlightedVerses[highlightKey].color}` : ''}`}
                        onContextMenu={(e) => handleContextMenu(e, verse)}
                        onTouchStart={(e) => handleTouchStart(e, verse)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Versículo ${verse.verse}: ${verse.text}`}
                      >
                        <span className="verse-number">{verse.verse}</span>
                        <span className="verse-text">{verse.text} </span>
                        {verseComments[commentKey] && (
                          <span className="comment-wrapper">
                            <span className="comment">
                              Comentario {verseComments[commentKey].type}: {verseComments[commentKey].text}
                              {loadingComment === commentKey && ' (Cargando...)'}
                            </span>
                            <button
                              className="close-comment"
                              onClick={() => handleCloseComment(verse, verseComments[commentKey].type)}
                              aria-label="Cerrar comentario"
                            >
                              X
                            </button>
                          </span>
                        )}
                        {notes[noteKey] && (
                          <span className="note">Nota: {notes[noteKey]}</span>
                        )}
                        {localStorage.getItem(prayerKey) && (
                          <audio
                            controls
                            src={localStorage.getItem(prayerKey)}
                            style={{ marginTop: '5px' }}
                            aria-label="Reproducir oración grabada"
                          />
                        )}
                        {noteInput.visible && noteInput.verse?.verse === verse.verse && (
                          <div className="note-input">
                            <textarea
                              placeholder="Escribe tu nota..."
                              defaultValue={notes[noteKey] || ''}
                              onChange={(e) => handleNoteChange(verse, e.target.value)}
                              autoFocus
                              aria-label="Escribir nota para el versículo"
                            />
                            <button
                              className="close-note"
                              onClick={closeNoteInput}
                              aria-label="Cerrar nota"
                            >
                              X
                            </button>
                          </div>
                        )}
                        {prayerModal.visible && prayerModal.verse?.verse === verse.verse && (
                          <div className="prayer-modal">
                            {/* Implementado en BibleReading.js */}
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
                    role="menu"
                    aria-label="Menú contextual del versículo"
                  >
                    <div className="menu-item" onClick={toggleHighlightSubmenu} role="menuitem">
                      Subrayar
                      {highlightSubmenu && (
                        <div className="submenu" role="menu">
                          <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'yellow')} role="menuitem">Amarillo</div>
                          <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'green')} role="menuitem">Verde</div>
                          <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'blue')} role="menuitem">Azul</div>
                          <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'pink')} role="menuitem">Rosa</div>
                        </div>
                      )}
                    </div>
                    <div className="menu-item" onClick={() => handleNote(contextMenu.verse)} role="menuitem">
                      Anotar
                    </div>
                    <div className="menu-item" onClick={() => handleShare(contextMenu.verse)} role="menuitem">
                      Compartir
                    </div>
                    <div className="menu-item" onClick={toggleCommentSubmenu} role="menuitem">
                      Comentario
                      {commentSubmenu && (
                        <div className="submenu" role="menu">
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'lingüístico')} role="menuitem">Lingüística</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'cultural')} role="menuitem">Cultural</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'histórico')} role="menuitem">Histórica</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'teológico')} role="menuitem">Teológica</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'geográfico')} role="menuitem">Geográfica</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'paleolítico')} role="menuitem">Paleolítica</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'arqueológico')} role="menuitem">Arqueológica</div>
                        </div>
                      )}
                    </div>
                    <div className="menu-item" onClick={toggleConcordanceSubmenu} role="menuitem">
                      Concordancia
                      {concordanceSubmenu && (
                        <div className="submenu" role="menu">
                          {loadingConcordance ? (
                            <div className="submenu-item" role="menuitem">Cargando...</div>
                          ) : (
                            getConcordances(contextMenu.verse).then(related =>
                              related.length === 0 ? (
                                <div className="submenu-item" role="menuitem">No hay concordancias</div>
                              ) : (
                                related.map((rel, index) => (
                                  <div
                                    key={index}
                                    className="submenu-item"
                                    onClick={() => handleConcordanceSelect(rel)}
                                    role="menuitem"
                                  >
                                    {rel.book} {rel.chapter}:{rel.verse}
                                  </div>
                                ))
                              )
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <div className="menu-item" onClick={() => handlePrayer(contextMenu.verse)} role="menuitem">
                      Orar
                    </div>
                  </div>
                )}
              </main>
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
                prayerModal={prayerModal}
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
              />
            }
          />
          <Route
            path="/collection"
            element={<Collection />}
          />
          <Route
            path="/filter"
            element={
              <ContentFilter
                backgroundColor={backgroundColor}
                backgroundImage={backgroundImage}
                fontFamily={fontFamily}
                fontSize={fontSize}
                textColor={textColor}
              />
            }
          />
        </Routes>
        {/* Fallback en caso de error de carga */}
        <div id="fallback" style={{ display: 'none' }}>
          <h1>Error al cargar la aplicación</h1>
          <p>Por favor, recarga la página o verifica tu conexión.</p>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
