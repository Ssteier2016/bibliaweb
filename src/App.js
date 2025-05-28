import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import bibleData from './data/reina_valera.json';
import concordances from './data/concordances.json';
import BibleReading from './components/BibleReading';
import Collection from './components/Collection';
import ErrorBoundary from './ErrorBoundary';
import './App.css';

function App() {
  const [selectedBook, setSelectedBook] = useState('Juan');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, verse: null });
  const [noteInput, setNoteInput] = useState({ visible: false, verse: null });
  const [notes, setNotes] = useState({});
  const [highlightedVerses, setHighlightedVerses] = useState({});
  const [highlightSubmenu, setHighlightSubmenu] = useState(false);
  const [commentSubmenu, setCommentSubmenu] = useState(false);
  const [concordanceSubmenu, setConcordanceSubmenu] = useState(false);
  const [verseComments, setVerseComments] = useState({});
  const [loadingComment, setLoadingComment] = useState(null);
  const [loadingConcordance, setLoadingConcordance] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const contextMenuRef = useRef(null);
  const touchStartPos = useRef(null);
  const navigate = useNavigate();

  const book = bibleData.books.find(b => b.name === selectedBook);
  const chapter = book?.chapters.find(c => c.chapter === selectedChapter);
  const verses = chapter?.verses.filter(v => v.text.toLowerCase().includes(searchQuery.toLowerCase())) || [];

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
    if (e.cancelable) {
      e.preventDefault();
    }
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
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
    }, 500);
    // Limpiar timeout al finalizar el toque
    e.target.addEventListener('touchend', () => {
      clearTimeout(timeout);
      touchStartPos.current = null;
    }, { once: true });
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

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <ErrorBoundary>
      <div className="App">
        <header>
          <h1>Bibl-ia</h1>
          <div className="menu-container">
            <button className="menu-button" onClick={toggleMenu}>
              ☰
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <Link to="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
                <Link to="/reading" onClick={() => setMenuOpen(false)}>Lectura Bíblica</Link>
                <Link to="/collection" onClick={() => setMenuOpen(false)}>Colección</Link>
              </div>
            )}
          </div>
        </header>
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
                {verses.map(verse => {
                  const highlightKey = `highlight_${selectedBook}_${selectedChapter}_${verse.verse}`;
                  const noteKey = `note_${selectedBook}_${selectedChapter}_${verse.verse}`;
                  const commentKey = `comment_${selectedBook}_${selectedChapter}_${verse.verse}_${verseComments[`comment_${selectedBook}_${selectedChapter}_${verse.verse}_type`]?.type || 'unknown'}`;
                  return (
                    <div
                      key={verse.verse}
                      className={`verse ${highlightedVerses[highlightKey] ? `highlighted-${highlightedVerses[highlightKey].color}` : ''}`}
                      onContextMenu={(e) => handleContextMenu(e, verse)}
                      onTouchStart={(e) => handleTouchStart(e, verse)}
                    >
                      <p><strong>{verse.verse}</strong>: {verse.text}</p>
                      {verseComments[commentKey] && (
                        <p className="comment-wrapper">
                          <span className="comment">
                            Comentario {verseComments[commentKey].type}: {verseComments[commentKey].text}
                            {loadingComment === commentKey && ' (Cargando...)'}
                          </span>
                          <button className="close-comment" onClick={() => handleCloseComment(verse, verseComments[commentKey].type)}>X</button>
                        </p>
                      )}
                      {notes[noteKey] && (
                        <p className="note">Nota: {notes[noteKey]}</p>
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
                    </div>
                  );
                })}
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
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                noteInput={noteInput}
                setNoteInput={setNoteInput}
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
              />
            }
          />
          <Route
            path="/collection"
            element={<Collection />}
          />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
