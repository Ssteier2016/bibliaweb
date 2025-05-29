import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import bibleData from './data/reina_valera.json';
import concordances from './data/concordances.json';
import BibleReading from './components/BibleReading';
import Collection from './components/Collection'; // Nuevo componente
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

  // ... (resto del código de App.js sin cambios hasta el menú)

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
                {/* ... (resto del código de la ruta "/" sin cambios) */}
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
