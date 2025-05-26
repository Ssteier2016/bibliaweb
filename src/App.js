import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { supabase } from './supabase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import bibleData from './data/reina_valera.json';
import './App.css';

function App() {
  const [selectedComment, setSelectedComment] = useState('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
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

  // Cargar notas desde Supabase
  useEffect(() => {
    const fetchNotes = async () => {
      const { data } = await supabase.from('notes').select('*');
      const notesObj = data.reduce((acc, note) => ({
        ...acc,
        [note.verse_id]: note.note
      }), {});
      setNotes(notesObj);
    };
    fetchNotes();
  }, []);

  // Cargar mensajes de Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'messages'), (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Guardar nota en Supabase
  const saveNote = async (verseId, note) => {
    if (note.trim()) {
      await supabase.from('notes').upsert({ verse_id: verseId, note });
      setNotes({ ...notes, [verseId]: note });
    }
  };

  // Enviar mensaje de chat
  const sendMessage = async () => {
    if (newMessage.trim()) {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        timestamp: new Date(),
      });
      setNewMessage('');
    }
  };

  // Manejar clic largo en versículo
  const handleContextMenu = (e, verse) => {
    e.preventDefault();
    const x = e.clientX || e.touches[0].clientX;
    const y = e.clientY || e.touches[0].clientY;
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
    setHighlightedVerses({
      ...highlightedVerses,
      [verse]: !highlightedVerses[verse]
    });
    setContextMenu({ visible: false, verse: null });
  };

  // Abrir campo de nota
  const handleNote = (verse) => {
    setNoteInput({ visible: true, verse });
    setContextMenu({ visible: false, verse: null });
  };

  // Guardar y cerrar nota
  const handleNoteChange = (verse, value) => {
    saveNote(verse, value);
  };

  // Cerrar campo de nota
  const closeNoteInput = () => {
    setNoteInput({ visible: false, verse: null });
  };

  // Compartir versículo
  const handleShare = async (verse) => {
    const text = `Juan 3:${verse.verse} - ${verse.text}`;
    if (navigator.share) {
      await navigator.share({ title: 'Biblia Web', text });
    } else {
      alert('Copia este versículo: ' + text);
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
      if (type === 'paleontologico') return 'No hay evidencia paleontológica directa en este versículo, pero el contexto puede incluir fósiles de la región.';
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
          <div className="menu-item" onClick={() => handleHighlight(contextMenu.verse)}>
            Subrayar
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
                <div className="submenu-item" onClick={() => handleCommentSelect('linguistico')}>
                  Lingüístico
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('cultural')}>
                  Cultural
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('historico')}>
                  Histórico
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('teologico')}>
                  Teológico
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('geografico')}>
                  Geográfico
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('paleontologico')}>
                  Paleontológico
                </div>
                <div className="submenu-item" onClick={() => handleCommentSelect('arqueologico')}>
                  Arqueológico
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <h2>Chat</h2>
      <div className="chat">
        {messages.map(msg => (
          <p key={msg.id}>{msg.text} <small>({new Date(msg.timestamp.toDate()).toLocaleTimeString()})</small></p>
        ))}
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button onClick={sendMessage}>Enviar</button>
      </div>
    </div>
  );
}

export default App;
