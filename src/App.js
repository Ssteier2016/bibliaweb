import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import bibleData from './data/reina_valera.json';
import concordances from './data/concordances.json';
import BibleReading from './components/BibleReading';
import Collection from './components/Collection';
import ContentFilter from './components/ContentFilter'; // Nueva importación
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
    { name: 'Cielo', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },
    { name: 'Montaña', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b' },
    { name: 'Mar', url: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0' },
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

  // Cargar notas, resaltados y comentarios
  useEffect(() => {
    const storedNotes = {};
    const storedHighlights = {};
    const storedComments = {};
    const currentBook = bibleData.books.find(b => b.name === selectedBook);
    if (currentBook) {
      const currentChapter = currentBook.chapters.find(c => c.chapter === selectedChapter);
      if (currentChapter) {
        currentChapter.verses.forEach(verse => {
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
      }
    }
    setNotes(storedNotes);
    setHighlightedVerses(storedHighlights);
    setVerseComments(storedComments);
  }, [selectedBook, selectedChapter]);

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
    console.log('Context menu opened:', { x, y, verse });
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
    console.log('Touch start:', { verse });
  };

  const handleHighlight = (verse, color) => {
    const key = `highlight_${selectedBook}_${selectedChapter}_${verse.verse}`;
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
    const key = `note_${selectedBook}_${selectedChapter}_${verse.verse}`;
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
        await navigator.share({ title: 'Biblia Web', text });
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
    const key = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${type}`;
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
      console.log('Sending comment request:', { prompt, key, apiKey: process.env.REACT_APP_HF_API_KEY ? 'Set' : 'Missing' });
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
        {
          inputs: prompt,
          max_tokens: 200,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_HF_API_KEY}`,
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true',
          },
          timeout: 30000,
        }
      );
      console.log('Comment response:', response.data);
      let commentText = response.data?.[0]?.generated_text?.trim() || 'No se recibió comentario.';
      if (commentText.startsWith(prompt)) {
        commentText = commentText.substring(prompt.length).trim();
      }
      commentText = commentText.split(' ').slice(0, 100).join(' ');
      const comment = { type, text: commentText };
      setVerseComments({ ...verseComments, [key]: comment });
      localStorage.setItem(key, JSON.stringify(comment));
    } catch (error) {
      console.error('Error fetching comment:', error);
      let errorMessage = 'Error al obtener el comentario. Verifica tu conexión o la clave API.';
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Error de red: No se pudo conectar con Hugging Face.';
      } else if (error.response) {
        errorMessage = `Error ${error.response.status}: ${error.response.data?.error || 'Error desconocido'}`;
      }
      setVerseComments({
        ...verseComments,
        [key]: { type, text: errorMessage }
      });
    }
    setLoadingComment(null);
    setContextMenu({ visible: false, verse: null });
    setCommentSubmenu(false);
  };

  const generateConcordance = async (verse) => {
    const reference = `${selectedBook} ${selectedChapter}:${verse.verse}`;
    const key = `concordance_${reference}`;
    const cachedConcordance = localStorage.getItem(key);
    if (cachedConcordance) {
      return JSON.parse(cachedConcordance);
    }
    setLoadingConcordance(reference);
    try {
      const prompt = `
        Eres un experto en estudios bíblicos. Proporciona hasta 3 referencias cruzadas (concordancias) para el versículo ${selectedBook} ${selectedChapter}:${verse.verse} ("${verse.text}") en la Biblia. Cada referencia debe incluir libro, capítulo, versículo y un fragmento breve del texto (máximo 20 palabras). Responde solo con un array JSON de objetos, por ejemplo:
        [
          {"book": "Génesis", "chapter": 1, "verse": 1, "text": "En el principio creó Dios..."},
          {"book": "Colosenses", "chapter": 1, "verse": 16, "text": "Porque en él fueron creadas..."}
        ]
      `;
      console.log('Sending concordance request:', { prompt, reference });
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
        {
          inputs: prompt,
          max_tokens: 300,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_HF_API_KEY}`,
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true',
          },
          timeout: 30000,
        }
      );
      console.log('Concordance response:', response.data);
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
  };

  const toggleCommentSubmenu = () => {
    setCommentSubmenu(!commentSubmenu);
    setHighlightSubmenu(false);
    setConcordanceSubmenu(false);
  };

  const handleCloseComment = (verse, type) => {
    const key = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${type}`;
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
    const entry = concordances.concordances.find(c => c.reference === reference);
    if (entry) return entry.related;
    const generated = await generateConcordance(verse);
    return generated;
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
  };

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
    setMenuOpen(false);
  };

  const handleCustomImageApply = () => {
    if (customBackgroundImage) {
      setBackgroundImage(customBackgroundImage);
      setBackgroundColor('#ffffff');
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
          <h1>Bibl-ia</h1>
          <div className="menu-container">
            <button className="menu-button" onClick={toggleMenu} aria-label="Abrir menú">
              ☰
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <Link to="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
                <Link to="/reading" onClick={() => setMenuOpen(false)}>Lectura Bíblica</Link>
                <Link to="/collection" onClick={() => setMenuOpen(false)}>Colección</Link>
                <Link to="/filter" onClick={() => setMenuOpen(false)}>Filtro de Bienestar</Link> {/* Nuevo enlace */}
                <div className="menu-item" onClick={toggleSettings} aria-label="Abrir configuración">Configuración</div>
              </div>
            )}
          </div>
        </header>
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
                    setBackgroundColor('#ffffff');
                    setCustomBackgroundImage('');
                  }}
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
                />
                <button onClick={handleCustomImageApply} disabled={!customBackgroundImage}>
                  Aplicar URL
                </button>
              </div>
              <div className="settings-item">
                <label htmlFor="fontFamily">Tipografía:</label>
                <select
                  id="fontFamily"
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
                  min="12"
                  max="24"
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
              <button className="close-settings" onClick={toggleSettings}>
                Cerrar
              </button>
            </div>
          </div>
        )}
        <Routes>
          <Route
            path="/"
            element={
              <div className="main-content">
                <div className="selector">
                  <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)}>
                    {bibleData.books.map(book => (
                      <option key={book.name} value={book.name}>{book.name}</option>
                    ))}
                  </select>
                  <select value={selectedChapter} onChange={(e) => setSelectedChapter(Number(e.target.value))}>
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
                />
                <div className="continuous-text">
                  {verses.map((verse, index) => {
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
                      >
                        <span className="verse-number">{verse.verse}</span>
                        <span className="verse-text">{verse.text} </span>
                        {verseComments[commentKey] && (
                          <span className="comment-wrapper">
                            <span className="comment">
                              Comentario {verseComments[commentKey].type}: {verseComments[commentKey].text}
                              {loadingComment === commentKey && ' (Cargando...)'}
                            </span>
                            <button className="close-comment" onClick={() => handleCloseComment(verse, verseComments[commentKey].type)}>X</button>
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
                          />
                        )}
                        {noteInput.visible && noteInput.verse?.verse === verse.verse && (
                          <div className="note-input">
                            <textarea
                              placeholder="Escribe tu nota..."
                              defaultValue={notes[noteKey] || ''}
                              onChange={(e) => handleNoteChange(verse, e.target.value)}
                              autoFocus
                            />
                            <button className="close-note" onClick={closeNoteInput}>X</button>
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
                  >
                    <div className="menu-item" onClick={toggleHighlightSubmenu}>
                      Subrayar
                      {highlightSubmenu && (
                        <div className="submenu">
                          <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'yellow')}>Amarillo</div>
                          <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'green')}>Verde</div>
                          <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'blue')}>Azul</div>
                          <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'pink')}>Rosa</div>
                        </div>
                      )}
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
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'lingüístico')}>Lingüística</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'cultural')}>Cultural</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'histórico')}>Histórica</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'teológico')}>Teológica</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'geográfico')}>Geográfica</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'paleolítico')}>Paleolítica</div>
                          <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'arqueológico')}>Arqueológica</div>
                        </div>
                      )}
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
                      )}
                    </div>
                    <div className="menu-item" onClick={() => handlePrayer(contextMenu.verse)}>
                      Orar
                    </div>
                  </div>
                )}
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
          /> {/* Nueva ruta */}
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
