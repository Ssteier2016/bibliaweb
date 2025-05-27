import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
  const [loadingComment, setLoadingComment] = useState(null);
  const contextMenuRef = useRef(null);
  const touchStartPos = useRef(null);

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
          const highlightKey = `highlight_${book.name}_${chapter.chapter}_${verse}`;
          const commentKey = `comment_${book.name}_${chapter.chapter}_${verse}`;
          const note = localStorage.getItem(noteKey);
          const highlight = localStorage.getItem(highlightKey);
          const comment = localStorage.getItem(commentKey);
          if (note) storedNotes[noteKey] = note;
          if (highlight) storedHighlights[highlightKey] = JSON.parse(highlight);
          if (comment) storedComments[commentKey] = JSON.parse(comment);
        });
      });
    });
    setNotes(storedNotes);
    setHighlightedVerses(storedHighlights);
    setVerseComments(storedComments);
  }, []);

  const handleContextMenu = (e, verse) => {
    if (e.cancelable) {
      e.preventDefault();
    }
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
    e.target.ontouchend = () => {
      clearTimeout(timeout);
      touchStartPos.current = null;
    };
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

  const handleCommentSelect = async (verse, type) => {
    const key = `comment_${selectedBook}_${selectedChapter}_${verse.verse}`;
    setLoadingComment(key);
    try {
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-2',
          messages: [
            {
              role: 'system',
              content: 'Eres un experto en estudios bíblicos. Proporciona comentarios breves y precisos sobre versículos de la Biblia, basándote en la traducción Reina-Valera.'
            },
            {
              role: 'user',
              content: `Proporciona un comentario ${type} breve (máximo 100 palabras) para ${selectedBook} ${selectedChapter}:${verse.verse} - "${verse.text}"`
            }
          ],
          max_tokens: 150,
          temperature: 0.6
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_GROK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const comment = response.data.choices[0].message.content.trim();
      setVerseComments({ ...verseComments, [key]: { type, text: comment } });
      localStorage.setItem(key, JSON.stringify({ type, text: comment }));
    } catch (error) {
      console.error('Error fetching Grok comment:', error.response?.data || error.message);
      setVerseComments({
        ...verseComments,
        [key]: { type, text: `Error: ${error.response?.data?.error?.message || 'No se pudo obtener el comentario.'}` }
      });
    }
    setLoadingComment(null);
    setContextMenu({ visible: false, verse: null });
    setCommentSubmenu(false);
  };

  const toggleCommentSubmenu = () => {
    setCommentSubmenu(!commentSubmenu);
    setHighlightSubmenu(false);
  };

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
            onTouchStart={(e) => handleTouchStart(e, verse)}
          >
            <p><strong>{verse.verse}</strong>: {verse.text}</p>
            {verseComments[commentKey] && (
              <p className="comment">
                Comentario {verseComments[commentKey].type}: {verseComments[commentKey].text}
                {loadingComment === commentKey && ' (Cargando...)'}
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
        </div>
      )}
    </div>
  );
}

export default App;
