import React, { useState, useEffect, useRef } from 'react';
import bibleData from './data/reina_valera.json';
import './App.css';

function App() {
  const [selectedComment, setSelectedComment] = useState('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, verse: null });
  const [noteInput, setNoteInput] = useState({ visible: false, verse: null });
  const [notes, setNotes] = useState({});
  const [highlightedVerses, setHighlightedVerses] = useState({});
  const [commentSubmenu, setCommentSubmenu] = useState(false);
  const contextMenuRef = useRef(null);

  const book = bibleData.books.find(b => b.name === 'Juan');
  const chapter = book.chapters[0];
  const verses = chapter.verses.filter(verse =>
    verse.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cargar notas desde localStorage
  useEffect(() => {
    const storedNotes = {};
    verses.forEach(verse => {
      const note = localStorage.getItem(`note_${verse.verse}`);
      if (note) storedNotes[verse.verse] = note;
    });
    setNotes(storedNotes);
  }, []);

  // Cargar subrayados desde localStorage
  useEffect(() => {
    const storedHighlights = {};
    verses.forEach(verse => {
      const isHighlighted = localStorage.getItem(`highlight_${verse.verse}`);
      if (isHighlighted === 'true') storedHighlights[verse.verse] = true;
    });
    setHighlightedVerses(storedHighlights);
  }, []);

  // Manejar clic largo en versículo
  const handleContextMenu = (e, verse) => {
    e.preventDefault();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setContextMenu({ visible: true, x, y, verse });
    setCommentSubmenu(false);
  };

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, verse: null });
        setCommentSubmenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Subrayar versículo
  const handleHighlight = (verse) => {
    const newHighlighted = !highlightedVerses[verse];
    setHighlightedVerses({
      ...highlightedVerses,
      [verse]: newHighlighted
    });
    localStorage.setItem(`highlight_${verse}`, newHighlighted.toString());
    setContextMenu({ visible: false, verse: null });
  };

  // Abrir campo de nota
  const handleNote = (verse) => {
    setNoteInput({ visible: true, verse });
    setContextMenu({ visible: false, verse: null });
  };

  // Guardar nota en localStorage
  const handleNoteChange = (verse, value) => {
    localStorage.setItem(`note_${verse}`, value);
    setNotes({ ...notes, [verse]: value });
  };

  // Cerrar campo de nota
  const closeNoteInput = () => {
    setNoteInput({ visible: false, verse: null });
  };

  // Compartir versículo
  const handleShare = async (verse) => {
    const text = `Juan 3:${verse.verse} - ${verse.text}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Biblia Web', text });
      } else {
        alert('Copia este versículo: ' + text);
      }
    } catch (error) {
      console.error('Error al compartir:', error);
    }
    setContextMenu({ visible: false, verse: null });
  };

  // Seleccionar comentario
  const handleCommentSelect = (type) => {
    setSelectedComment(type);
    setContextMenu({ visible: false, verse: null });
    setCommentSubmenu(false);
  };

  // Mostrar submenú de comentarios
  const toggleCommentSubmenu = () => {
    setCommentSubmenu(!commentSubmenu);
  };

  // Comentarios simulados
  function getMockComment(verse, type) {
    if (verse === 16) {
      if (type === 'teologico') return 'Expresa el amor sacrificial de Dios, un pilar del cristianismo.';
      if (type === 'historico') return 'Escrito en un contexto de tensión entre cristianos y judíos en el siglo I.';
      if (type === 'cultural') return 'El término "mundo" (kosmos) refleja una visión inclusiva en la cultura grecorromana.';
      if (type === 'linguistico') return 'La palabra "unigénito" (monogenes) en griego enfatiza la unicidad de Jesús.';
      if (type === 'geografico') return 'El evangelio de Juan se sitúa en Judea, con referencias a Jerusalén y Galilea.';
      if (type === 'paleontologico') return 'No hay evidencia paleontológica directa, pero el contexto puede incluir fósiles de la región.';
      if (type === 'arqueologico') return 'Excavaciones en Judea han encontrado sinagogas del siglo I, contextualizando el ministerio de Jesús.';
    }
    return 'Comentario en desarrollo...';
  }

  return (
    <div className="App">
      <h1>Biblia Web</h1>
      <input
        type="text"
        placeholder="Buscar versículos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {verses.map(verse => (
        <div
          key={verse.verse}
          className={`verse ${highlightedVerses[verse.verse] ? 'highlighted' : ''}`}
          onContextMenu={(e) => handleContextMenu(e, verse)}
          onTouchStart={(e) => {
            const timeout = setTimeout(() => handleContextMenu(e, verse), 500);
            return () => clearTimeout(timeout);
          }}
        >
          <p><strong>{verse.verse}</strong>: {verse.text}</p>
          {selectedComment !== 'none' && (
            <p>Comentario {selectedComment}: {getMockComment(verse.verse, selectedComment)}</p>
          )}
          {notes[verse.verse] && (
            <p className="note">Nota: {notes[verse.verse]}</p>
          )}
          {noteInput.visible && noteInput.verse === verse.verse && (
            <div className="note-input">
              <textarea
                placeholder="Escribe tu nota..."
                value={notes[verse.verse] || ''}
                onChange={(e) => handleNoteChange(verse.verse, e.target.value)}
                autoFocus
              />
              <button className="close-note" onClick={closeNoteInput}>X</button>
            </div>
          )}
        </div>
      ))}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          ref={contextMenuRef}
        >
          <div className="menu-item" onClick={() => handleHighlight(contextMenu.verse.verse)}>
            {highlightedVerses[contextMenu.verse.verse] ? 'Quitar subrayado' : 'Subrayar'}
          </div>
          <div className="menu-item" onClick={() => handleNote(contextMenu.verse.verse)}>
            Anotar
          </div>
          <div className="menu-item" onClick={() => handleShare(contextMenu.verse)}>
            Compartir
          </div>
          <div className="menu-item" onClick={toggleCommentSubmenu}>
            Comentario
            {commentSubmenu && (
              <div className="submenu">
                <div className="submenu-item" onClick={() => handleCommentSelect('linguistico')}>
                  Lingüística
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('cultural')}>
                  Cultural
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('historico')}>
                  Histórica
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('teologico')}>
                  Teológica
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('geografico')}>
                  Geográfica
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('paleontologico')}>
                  Paleontológica
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('arqueologico')}>
                  Arqueológica
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
