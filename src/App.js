import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
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
  const [contextMenu, setContextMenu] = useState({ visible: false, verse: null });
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
    setContextMenu({ visible: true, verse });
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
    e.target.addEventListener('touchend', () => {
      clearTimeout(timeout);
      touchStartPos.current = null;
    }, { once: true });
  };

  const handleHighlight = (verse, color) => {
    const key = `highlight_${verse.book}_${verse.chapter}_${verse.verse}`;
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
    const key = `note_${verse.book}_${verse.chapter}_${verse.verse}`;
    setNotes({ ...notes, [key]: value });
    localStorage.setItem(key, value);
  };

  const closeNoteInput = () => {
    setNoteInput({ visible: false, verse: null });
  };

  const handleShare = async (verse) => {
    const text = `${verse.book} ${verse.chapter}:${verse.verse} - ${verse.text}`;
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
    const key = `comment_${verse.book}_${verse.chapter}_${verse.verse}_${type}`;
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
        Eres un experto en exégesis bíblica. Proporciona un comentario de tipo "${type}" para el versículo ${verse.book} ${verse.chapter}:${verse.verse} ("${verse.text}") en español. El comentario debe ser detallado, claro, con un máximo de 100 palabras, relevante al contexto bíblico.
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
            'Authorization': `Bearer ${process.env.REACT_APP_HF_API_KEY}`,
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
    const reference = `${verse.book} ${verse.chapter}:${verse.verse}`;
    const key = `concordance_${reference}`;
    const cachedConcordance = localStorage.getItem(key);
    if (cachedConcordance) {
      return JSON.parse(cachedConcordance);
    }
    setLoadingConcordance(reference);
    try {
      const prompt = `
        Eres un experto en estudios bíblicos. Proporciona hasta 3 referencias cruzadas para el versículo ${verse.book} ${verse.chapter}:${verse.verse} ("${verse.text}") en la Biblia. Responde solo con un array JSON de objetos, por ejemplo:
        [
          {"book": "Génesis", "chapter": 1, "verse": 1, "text": "En el principio creó Dios..."}
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
            'Authorization': `Bearer ${process.env.REACT_APP_HF_API_KEY}`,
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
  };

  const toggleCommentSubmenu = () => {
    setCommentSubmenu(!commentSubmenu);
    setHighlightSubmenu(false);
    setConcordanceSubmenu(false);
  };

  const handleCloseComment = (verse, type) => {
    const key = `comment_${verse.book}_${verse.chapter}_${verse.verse}_${type}`;
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
    const reference = `${verse.book} ${verse.chapter}:${verse.verse}`;
    const entry = concordances.concordances.find(c => c.reference === reference);
    if (entry) return entry.related;
    const generated = await generateConcordance(verse);
    return generated;
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const bibleReadingProps = {
    bibleData,
    concordances,
    handleContextMenu,
    handleTouchStart,
    handleHighlight,
    toggleHighlightSubmenu,
    handleNote,
    handleNoteChange,
    closeNoteInput,
    handleShare,
    handleCommentSelect,
    toggleCommentSubmenu,
    handleCloseComment,
    toggleConcordanceSubmenu,
    handleConcordanceSelect,
    getConcordances,
    contextMenu,
    setContextMenu,
    noteInput,
    setNoteInput,
    notes,
    setNotes,
    highlightedVerses,
    setHighlightedVerses,
    highlightSubmenu,
    setHighlightSubmenu,
    commentSubmenu,
    setCommentSubmenu,
    concordanceSubmenu,
    setConcordanceSubmenu,
    verseComments,
    setVerseComments,
    loadingComment,
    setLoadingComment,
    loadingConcordance,
    setLoadingConcordance,
    contextMenuRef,
    selectedBook,
    setSelectedBook,
    selectedChapter,
    setSelectedChapter,
    searchQuery,
    setSearchQuery,
  };

  return (
    <ErrorBoundary>
      <Router>
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
            <Route path="/reading" element={<BibleReading {...bibleReadingProps} isHome={false} />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/" element={<BibleReading {...bibleReadingProps} isHome={true} />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
