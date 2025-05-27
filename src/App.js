import React, { useState, useEffect, useRef } from 'react';
import bibleData from './data/reina_valera.json';
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
  const [verseComments, setVerseComments] = useState({});
  const contextMenuRef = useRef(null);

  const book = bibleData.books.find(b => b.name === selectedBook);
  const chapter = book?.chapters.find(c => c.chapter === selectedChapter);
  const verses = chapter?.verses.filter(v => v.text.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  useEffect(() => {
    const storedNotes = {};
    const storedHighlights = {};
    const storedComments = {};
    bibleData.books.forEach(book => {
      book.chapters.forEach(chapter => {
        chapter.verses.forEach(verse => {
          const noteKey = `note_${book.name}_${chapter.chapter}_${verse.verse}`;
          const highlightKey = `highlight_${book.name}_${chapter.chapter}_${verse.verse}`;
          const commentKey = `comment_${book.name}_${chapter.chapter}_${verse.verse}`;
          const note = localStorage.getItem(noteKey);
          const highlight = localStorage.getItem(highlightKey);
          const comment = localStorage.getItem(commentKey);
          if (note) storedNotes[noteKey] = note;
          if (highlight) storedHighlights[highlightKey] = JSON.parse(highlight);
          if (comment) storedComments[commentKey] = comment;
        });
      });
    });
    setNotes(storedNotes);
    setHighlightedVerses(storedHighlights);
    setVerseComments(storedComments);
  }, []);

  const handleContextMenu = (e, verse) => {
    e.preventDefault();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setContextMenu({ visible: true, x, y, verse });
    setHighlightSubmenu(false);
    setCommentSubmenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, verse: null });
        setHighlightSubmenu(false);
        setCommentSubmenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

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
      console.error('Error al compartir:', error);
    }
    setContextMenu({ visible: false, verse: null });
  };

  const handleCommentSelect = (verse, type) => {
    const key = `comment_${selectedBook}_${selectedChapter}_${verse.verse}`;
    setVerseComments({ ...verseComments, [key]: type });
    localStorage.setItem(key, type);
    setContextMenu({ visible: false, verse: null });
    setCommentSubmenu(false);
  };

  const toggleCommentSubmenu = () => {
    setCommentSubmenu(!commentSubmenu);
    setHighlightSubmenu(false);
  };

  function getMockComment(verse, type) {
    const key = `${selectedBook}_${selectedChapter}_${verse.verse}`;
    const comments = {
      'Apocalipsis_22_19': {
        teologico: 'Advierte sobre la integridad de la profecía, enfatizando la santidad del texto.',
        historico: 'Escrito en un contexto de persecución romana, refleja la urgencia de preservar la fe.',
        cultural: 'La "santa ciudad" evoca la esperanza de la Nueva Jerusalén en la comunidad cristiana.',
        linguistico: '"Libro de la vida" (biblion tes zoes) en griego simboliza la salvación eterna.',
        geografico: 'La Nueva Jerusalén es una visión simbólica, no un lugar físico.',
        paleolitico: 'No aplica directamente, pero el simbolismo puede evocar un mundo renovado.',
        arqueologico: 'Patmos, donde Juan recibió la visión, tiene restos de comunidades cristianas.'
      }
    };
    return comments[key]?.[type] || 'Comentario en desarrollo...';
  }

  return (
    <div className="App">
      <h1>Biblia Web</h1>
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
        const commentKey = `comment_${selectedBook}_${selectedChapter}_${verse.verse}`;
        return (
          <div
            key={verse.verse}
            className={`verse ${highlightedVerses[highlightKey] ? `highlighted-${highlightedVerses[highlightKey].color}` : ''}`}
            onContextMenu={(e) => handleContextMenu(e, verse)}
            onTouchStart={(e) => {
              const timeout = setTimeout(() => handleContextMenu(e, verse), 500);
              e.target.ontouchend = () => clearTimeout(timeout);
            }}
          >
            <p><strong>{verse.verse}</strong>: {verse.text}</p>
            {verseComments[commentKey] && (
              <p>Comentario {verseComments[commentKey]}: {getMockComment(verse, verseComments[commentKey])}</p>
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
                <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'linguistico')}>Lingüística</div>
                <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'cultural')}>Cultural</div>
                <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'historico')}>Histórica</div>
                <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'teologico')}>Teológica</div>
                <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'geografico')}>Geográfica</div>
                <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'paleolitico')}>Paleolítica</div>
                <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'arqueologico')}>Arqueológica</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
