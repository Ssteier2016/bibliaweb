import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import charactersData from '../data/characters.json';

function BibleReading({
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
  isHome,
}) {
  const [selectedBookObj, setSelectedBookObj] = useState(null);
  const [selectedChapterObj, setSelectedChapterObj] = useState(null);
  const [completedBooks, setCompletedBooks] = useState({});
  const [completedChapters, setCompletedChapters] = useState({});
  const [prayerMenu, setPrayerMenu] = useState({ visible: false, verse: null });
  const [prayers, setPrayers] = useState({});
  const [recording, setRecording] = useState(false);
  const [unlockDate, setUnlockDate] = useState('');
  const [selectedVerse, setSelectedVerse] = useState(null);
  const navigate = useNavigate();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const storedBooks = JSON.parse(localStorage.getItem('completedBooks') || '{}');
    const storedChapters = JSON.parse(localStorage.getItem('completedChapters') || '{}');
    const storedPrayers = JSON.parse(localStorage.getItem('prayers') || '{}');
    setCompletedBooks(storedBooks);
    setCompletedChapters(storedChapters);
    setPrayers(storedPrayers);
  }, []);

  const formatDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toggleBookCompletion = (bookName) => {
    const newCompletedBooks = {
      ...completedBooks,
      [bookName]: {
        completed: !completedBooks[bookName]?.completed,
        date: !completedBooks[bookName]?.completed ? formatDate() : completedBooks[bookName]?.date || null,
      },
    };
    setCompletedBooks(newCompletedBooks);
    localStorage.setItem('completedBooks', JSON.stringify(newCompletedBooks));
  };

  const toggleChapterCompletion = (bookName, chapterNumber) => {
    const key = `${bookName}_${chapterNumber}`;
    const chapter = bibleData.books
      .find((book) => book.name === bookName)
      ?.chapters.find((ch) => ch.chapter === chapterNumber);
    if (!chapter) return;

    const newCompletedChapters = {
      ...completedChapters,
      [key]: {
        completed: !completedChapters[key]?.completed,
        date: !completedChapters[key]?.completed ? formatDate() : completedChapters[key]?.date || null,
      },
    };
    setCompletedChapters(newCompletedChapters);
    localStorage.setItem('completedChapters', JSON.stringify(newCompletedChapters));

    if (!completedChapters[key]?.completed) {
      const character = charactersData.find((c) => c.chapter === `${bookName} ${chapterNumber}`);
      if (character) {
        const collection = JSON.parse(localStorage.getItem('collection') || '[]');
        if (!collection.some((c) => c.name === character.name)) {
          collection.push(character);
          localStorage.setItem('collection', JSON.stringify(collection));
          alert(`¡Has desbloqueado la carta de ${character.name}!`);
        }
      }
    }
  };

  const handleBookClick = (book) => {
    if (!book?.name) return;
    setSelectedBookObj(book);
    setSelectedChapterObj(null);
    navigate(`/reading?book=${encodeURIComponent(book.name)}`);
  };

  const handleChapterClick = (chapter) => {
    if (!chapter?.chapter || !selectedBookObj?.name) return;
    setSelectedChapterObj(chapter);
    navigate(`/reading?book=${encodeURIComponent(selectedBookObj.name)}&chapter=${chapter.chapter}`);
  };

  const handleBack = () => {
    if (selectedChapterObj) {
      setSelectedChapterObj(null);
      navigate(`/reading?book=${encodeURIComponent(selectedBookObj?.name)}`);
    } else if (selectedBookObj) {
      setSelectedBookObj(null);
      navigate('/reading');
    }
  };

  const handleVerseClick = (verse) => {
    if (!verse) return;
    setSelectedVerse(verse);
    handleContextMenu(null, verse);
    setPrayerMenu({ visible: false, verse: null });
  };

  const togglePrayerMenu = (verse) => {
    if (!verse) return;
    setPrayerMenu({
      visible: !prayerMenu.visible || prayerMenu.verse !== verse,
      verse,
    });
    setContextMenu({ visible: false, verse: null });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const audioData = reader.result;
          const prayerKey = `prayer_${prayerMenu.verse.book}_${prayerMenu.verse.chapter}_${prayerMenu.verse.verse}`;
          const duration = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0) / (128 * 1024 / 8);
          const newPrayers = {
            ...prayers,
            [prayerKey]: {
              audio: audioData,
              unlockDate,
              recordDate: formatDate(),
              duration: Math.round(duration),
            },
          };
          setPrayers(newPrayers);
          localStorage.setItem('prayers', JSON.stringify(newPrayers));
          setRecording(false);
          setPrayerMenu({ visible: false, verse: null });
          stream.getTracks().forEach((track) => track.stop());
        };
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('No se pudo iniciar la grabación. Verifica los permisos de micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePrayerClick = (verse) => {
    if (!verse) return;
    const prayerKey = `prayer_${verse.book}_${verse.chapter}_${verse.verse}`;
    const prayer = prayers[prayerKey];
    if (prayer) {
      const unlockDate = new Date(prayer.unlockDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (unlockDate <= today) {
        const audio = new Audio(prayer.audio);
        audio.play().catch((error) => console.error('Error al reproducir:', error));
      } else {
        alert(`Oración bloqueada hasta ${prayer.unlockDate}\nGrabada el: ${prayer.recordDate}\nDuración: ${prayer.duration}s`);
      }
    }
  };

  const searchVerses = () => {
    if (!searchQuery?.trim()) {
      const book = bibleData.books.find((b) => b.name === selectedBook);
      const chapter = book?.chapters?.find((c) => c.chapter === selectedChapter);
      return (
        chapter?.verses?.map((verse) => ({
          ...verse,
          book: book.name,
          chapter: chapter.chapter,
        })) || []
      );
    }

    const results = [];
    bibleData.books.forEach((book) => {
      book.chapters.forEach((chapter) => {
        chapter.verses.forEach((verse) => {
          if (verse.text.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({
              ...verse,
              book: book.name,
              chapter: chapter.chapter,
            });
          }
        });
      });
    });
    return results;
  };

  const verses = isHome
    ? searchVerses()
    : (selectedChapterObj?.verses?.map((verse) => ({
        ...verse,
        book: selectedBookObj?.name,
        chapter: selectedChapterObj?.chapter,
      })) || []);

  if (!bibleData?.books) {
    return <div>Cargando datos de la Biblia...</div>;
  }

  return (
    <div className="bible-reading">
      {isHome ? (
        <div className="main-content">
          <div className="selector">
            <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)}>
              <option value="">Selecciona un libro</option>
              {bibleData.books.map((book) => (
                <option key={book.name} value={book.name}>
                  {book.name}
                </option>
              ))}
            </select>
            <select value={selectedChapter} onChange={(e) => setSelectedChapter(Number(e.target.value))}>
              <option value="">Selecciona un capítulo</option>
              {bibleData.books
                .find((b) => b.name === selectedBook)
                ?.chapters.map((chapter) => (
                  <option key={chapter.chapter} value={chapter.chapter}>
                    {chapter.chapter}
                  </option>
                ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Buscar en toda la Biblia..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="verse-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {verses.length === 0 && searchQuery && <p>No se encontraron resultados.</p>}
            {verses.map((verse, index) => {
              const highlightKey = `highlight_${verse.book}_${verse.chapter}_${verse.verse}`;
              const noteKey = `note_${verse.book}_${verse.chapter}_${verse.verse}`;
              const commentKey = `comment_${verse.book}_${verse.chapter}_${verse.verse}_${verseComments[`comment_${verse.book}_${verse.chapter}_${verse.verse}_type`]?.type || 'unknown'}`;
              const prayerKey = `prayer_${verse.book}_${verse.chapter}_${verse.verse}`;
              const isSelected =
                selectedVerse &&
                verse.verse === selectedVerse.verse &&
                verse.book === selectedVerse.book &&
                verse.chapter === selectedVerse.chapter;
              return (
                <div
                  key={`${verse.book}_${verse.chapter}_${verse.verse}_${index}`}
                  className={`verse ${highlightedVerses[highlightKey] ? `highlighted-${highlightedVerses[highlightKey].color}` : ''} ${isSelected ? 'selected-verse' : ''}`}
                  onClick={() => handleVerseClick(verse)}
                  onTouchStart={(e) => handleTouchStart(e, verse)}
                  style={{ position: 'relative', padding: '10px' }}
                >
                  {prayers[prayerKey] && (
                    <span
                      className="prayer-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrayerClick(verse);
                      }}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        cursor: 'pointer',
                        fontSize: '20px',
                      }}
                    >
                      ▶️🔒
                    </span>
                  )}
                  <p style={{ margin: '0', padding: '0 20px' }}>
                    <strong>
                      {verse.book} {verse.chapter}:{verse.verse}
                    </strong>
                    : {verse.text}
                  </p>
                  {verseComments[commentKey] && (
                    <p className="comment-wrapper">
                      <span className="comment">
                        Comentario {verseComments[commentKey].type}: {verseComments[commentKey].text}
                        {loadingComment === commentKey && ' (Cargando...)'}
                      </span>
                      <button
                        className="close-comment"
                        onClick={() => handleCloseComment(verse, verseComments[commentKey].type)}
                      >
                        X
                      </button>
                    </p>
                  )}
                  {notes[noteKey] && <p className="note">Nota: {notes[noteKey]}</p>}
                  {noteInput.visible &&
                    noteInput.verse &&
                    verse.verse === noteInput.verse?.verse &&
                    verse.book === noteInput.verse?.book &&
                    verse.chapter === noteInput.verse?.chapter && (
                      <div className="note-input">
                        <textarea
                          placeholder="Escribe tu nota..."
                          defaultValue={notes[noteKey] || ''}
                          onChange={(e) => handleNoteChange(verse, e.target.value)}
                          autoFocus
                        />
                        <button className="close-note" onClick={closeNoteInput}>
                          X
                        </button>
                      </div>
                    )}
                </div>
              );
            })}
            {contextMenu.visible && contextMenu.verse && (
              <div
                className="context-menu"
                ref={contextMenuRef}
                style={{
                  position: 'fixed',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  backgroundColor: 'white',
                  padding: '10px',
                  boxShadow: '0 -2px 5px rgba(0,0,0,0.2)',
                  zIndex: '1000',
                  animation: 'slideUp 0.3s ease-out forwards',
                }}
              >
                <div className="menu-buttons">
                  <button className="menu-button" onClick={() => toggleHighlightSubmenu()}>
                    <img src="/assets/icons/subrayar.png" alt="Subrayar" />
                  </button>
                  <button className="menu-button" onClick={() => handleNote(contextMenu.verse)}>
                    <img src="/assets/icons/anotar.png" alt="Anotar" />
                  </button>
                  <button className="menu-button" onClick={() => handleShare(contextMenu.verse)}>
                    <img src="/assets/icons/compartir.png" alt="Compartir" />
                  </button>
                  <button className="menu-button" onClick={() => toggleCommentSubmenu()}>
                    <img src="/assets/icons/comentarios.png" alt="Comentarios" />
                  </button>
                  <button className="menu-button" onClick={() => toggleConcordanceSubmenu()}>
                    <img src="/assets/icons/concordancia.png" alt="Concordancia" />
                  </button>
                  <button className="menu-button" onClick={() => togglePrayerMenu(contextMenu.verse)}>
                    <img src="/assets/icons/oracion.png" alt="Oración" />
                  </button>
                </div>
                {highlightSubmenu && (
                  <div className="color-submenu">
                    <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'red')}>
                      <img src="/assets/icons/rojo.png" alt="Rojo" />
                    </button>
                    <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'green')}>
                      <img src="/assets/icons/verde.png" alt="Verde" />
                    </button>
                    <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'pink')}>
                      <img src="/assets/icons/rosa.png" alt="Rosa" />
                    </button>
                    <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'cyan')}>
                      <img src="/assets/icons/celeste.png" alt="Celeste" />
                    </button>
                    <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'blue')}>
                      <img src="/assets/icons/azul.png" alt="Azul" />
                    </button>
                    <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'purple')}>
                      <img src="/assets/icons/violeta.png" alt="Violeta" />
                    </button>
                    <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'yellow')}>
                      <img src="/assets/icons/amarillo.png" alt="Amarillo" />
                    </button>
                  </div>
                )}
                {commentSubmenu && (
                  <div className="comment-submenu">
                    <button
                      className="submenu-item"
                      onClick={() => handleCommentSelect(contextMenu.verse, 'lingüístico')}
                    >
                      Lingüística
                    </button>
                    <button
                      className="submenu-item"
                      onClick={() => handleCommentSelect(contextMenu.verse, 'cultural')}
                    >
                      Cultural
                    </button>
                    <button
                      className="submenu-item"
                      onClick={() => handleCommentSelect(contextMenu.verse, 'histórico')}
                    >
                      Histórica
                    </button>
                    <button
                      className="submenu-item"
                      onClick={() => handleCommentSelect(contextMenu.verse, 'teológico')}
                    >
                      Teológica
                    </button>
                    <button
                      className="submenu-item"
                      onClick={() => handleCommentSelect(contextMenu.verse, 'geográfico')}
                    >
                      Geográfica
                    </button>
                    <button
                      className="submenu-item"
                      onClick={() => handleCommentSelect(contextMenu.verse, 'paleolítico')}
                    >
                      Paleolítica
                    </button>
                    <button
                      className="submenu-item"
                      onClick={() => handleCommentSelect(contextMenu.verse, 'arqueológico')}
                    >
                      Arqueológica
                    </button>
                  </div>
                )}
                {concordanceSubmenu && (
                  <div className="concordance-submenu">
                    {loadingConcordance ? (
                      <div className="submenu-item">Cargando...</div>
                    ) : (
                      getConcordances(contextMenu.verse).then((related) =>
                        related.length === 0 ? (
                          <div className="submenu-item">No se encontraron concordancias</div>
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
                <button
                  className="close-menu-button"
                  onClick={() => setContextMenu({ visible: false, verse: null })}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '5px 10px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  X
                </button>
              </div>
            )}
            {prayerMenu.visible && prayerMenu.verse && (
              <div
                className="prayer-menu"
                style={{
                  position: 'fixed',
                  bottom: '120px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: '1001',
                }}
              >
                <div className="prayer-menu-content">
                  <button
                    className="prayer-button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={!unlockDate}
                  >
                    {recording ? 'Detener Grabación' : 'Grabar Oración'}
                  </button>
                  <input
                    type="date"
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <button
                    className="close-prayer"
                    onClick={() => setPrayerMenu({ visible: false, verse: null })}
                  >
                    X
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <button
            className="back-button"
            onClick={handleBack}
            style={{ display: selectedBookObj ? 'block' : 'none' }}
          >
            ← Volver
          </button>
          {!selectedBookObj ? (
            <div className="book-list">
              <h2>Libros de la Biblia</h2>
              {bibleData.books.map((book) => (
                <div key={book.name} className="book-item">
                  <input
                    type="checkbox"
                    checked={!!completedBooks[book.name]?.completed}
                    onChange={() => toggleBookCompletion(book.name)}
                  />
                  <span onClick={() => handleBookClick(book)}>
                    {book.name}
                    {completedBooks[book.name]?.date && ` - Marcado el ${completedBooks[book.name].date}`}
                  </span>
                </div>
              ))}
            </div>
          ) : !selectedChapterObj ? (
            <div className="chapter-list">
              <h2>Capítulos de {selectedBookObj.name}</h2>
              {selectedBookObj.chapters.map((chapter) => (
                <div key={chapter.chapter} className="chapter-item">
                  <input
                    type="checkbox"
                    checked={!!completedChapters[`${selectedBookObj.name}_${chapter.chapter}`]?.completed}
                    onChange={() => toggleChapterCompletion(selectedBookObj.name, chapter.chapter)}
                  />
                  <span onClick={() => handleChapterClick(chapter)}>
                    Capítulo {chapter.chapter}
                    {completedChapters[`${selectedBookObj.name}_${chapter.chapter}`]?.date &&
                      ` - Marcado el ${completedChapters[`${selectedBookObj.name}_${chapter.chapter}`].date}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="verse-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <h2>
                {selectedBookObj.name} {selectedChapterObj.chapter}
              </h2>
              {verses.map((verse, index) => {
                const highlightKey = `highlight_${verse.book}_${verse.chapter}_${verse.verse}`;
                const noteKey = `note_${verse.book}_${verse.chapter}_${verse.verse}`;
                const commentKey = `comment_${verse.book}_${verse.chapter}_${verse.verse}_${verseComments[`comment_${verse.book}_${verse.chapter}_${verse.verse}_type`]?.type || 'unknown'}`;
                const prayerKey = `prayer_${verse.book}_${verse.chapter}_${verse.verse}`;
                const isSelected =
                  selectedVerse &&
                  verse.verse === selectedVerse.verse &&
                  verse.book === selectedVerse.book &&
                  verse.chapter === selectedVerse.chapter;
                return (
                  <div
                    key={`${verse.book}_${verse.chapter}_${verse.verse}_${index}`}
                    className={`verse ${highlightedVerses[highlightKey] ? `highlighted-${highlightedVerses[highlightKey].color}` : ''} ${isSelected ? 'selected-verse' : ''}`}
                    onClick={() => handleVerseClick(verse)}
                    onTouchStart={(e) => handleTouchStart(e, verse)}
                    style={{ position: 'relative', padding: '10px' }}
                  >
                    {prayers[prayerKey] && (
                      <span
                        className="prayer-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrayerClick(verse);
                        }}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          cursor: 'pointer',
                          fontSize: '20px',
                        }}
                      >
                        ▶️
                      </span>
                    )}
                    <p style={{ margin: '0', padding: '0 20px' }}>
                      <strong>{verse.verse}</strong>: {verse.text}
                    </p>
                    {verseComments[commentKey] && (
                      <p className="comment-wrapper">
                        <span className="comment">
                          Comentario {verseComments[commentKey].type}: {verseComments[commentKey].text}
                          {loadingComment === commentKey && ' (Cargando...)'}
                        </span>
                        <button
                          className="close-comment"
                          onClick={() => handleCloseComment(verse, verseComments[commentKey].type)}
                        >
                          X
                        </button>
                      </p>
                    )}
                    {notes[noteKey] && <p className="note">Nota: {notes[noteKey]}</p>}
                    {noteInput.visible &&
                      noteInput.verse &&
                      verse.verse === noteInput.verse?.verse &&
                      verse.book === noteInput.verse?.book &&
                      verse.chapter === noteInput.verse?.chapter && (
                        <div className="note-input">
                          <textarea
                            placeholder="Escribe tu nota..."
                            defaultValue={notes[noteKey] || ''}
                            onChange={(e) => handleNoteChange(verse, e.target.value)}
                            autoFocus
                          />
                          <button className="close-note" onClick={closeNoteInput}>
                            X
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
              {contextMenu.visible && contextMenu.verse && (
                <div
                  className="context-menu"
                  ref={contextMenuRef}
                  style={{
                    position: 'fixed',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    backgroundColor: 'white',
                    padding: '10px',
                    boxShadow: '0 -2px 5px rgba(0,0,0,0.2)',
                    zIndex: '1000',
                    animation: 'slideUp 0.3s ease-out forwards',
                  }}
                >
                  <div className="menu-buttons">
                    <button className="menu-button" onClick={() => toggleHighlightSubmenu()}>
                      <img src="/assets/icons/subrayar.png" alt="Subrayar" />
                    </button>
                    <button className="menu-button" onClick={() => handleNote(contextMenu.verse)}>
                      <img src="/assets/icons/anotar.png" alt="Anotar" />
                    </button>
                    <button className="menu-button" onClick={() => handleShare(contextMenu.verse)}>
                      <img src="/assets/icons/compartir.png" alt="Compartir" />
                    </button>
                    <button className="menu-button" onClick={() => toggleCommentSubmenu()}>
                      <img src="/assets/icons/comentarios.png" alt="Comentarios" />
                    </button>
                    <button className="menu-button" onClick={() => toggleConcordanceSubmenu()}>
                      <img src="/assets/icons/concordancia.png" alt="Concordancia" />
                    </button>
                    <button className="menu-button" onClick={() => togglePrayerMenu(contextMenu.verse)}>
                      <img src="/assets/icons/oracion.png" alt="Oración" />
                    </button>
                  </div>
                  {highlightSubmenu && (
                    <div className="color-submenu">
                      <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'red')}>
                        <img src="/assets/icons/rojo.png" alt="Rojo" />
                      </button>
                      <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'green')}>
                        <img src="/assets/icons/verde.png" alt="Verde" />
                      </button>
                      <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'pink')}>
                        <img src="/assets/icons/rosa.png" alt="Rosa" />
                      </button>
                      <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'cyan')}>
                        <img src="/assets/icons/celeste.png" alt="Celeste" />
                      </button>
                      <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'blue')}>
                        <img src="/assets/icons/azul.png" alt="Azul" />
                      </button>
                      <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'purple')}>
                        <img src="/assets/icons/violeta.png" alt="Violeta" />
                      </button>
                      <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'yellow')}>
                        <img src="/assets/icons/amarillo.png" alt="Amarillo" />
                      </button>
                    </div>
                  )}
                  {commentSubmenu && (
                    <div className="comment-submenu">
                      <button
                        className="submenu-item"
                        onClick={() => handleCommentSelect(contextMenu.verse, 'lingüístico')}
                      >
                        Lingüística
                      </button>
                      <button
                        className="submenu-item"
                        onClick={() => handleCommentSelect(contextMenu.verse, 'cultural')}
                      >
                        Cultural
                      </button>
                      <button
                        className="submenu-item"
                        onClick={() => handleCommentSelect(contextMenu.verse, 'histórico')}
                      >
                        Histórica
                      </button>
                      <button
                        className="submenu-item"
                        onClick={() => handleCommentSelect(contextMenu.verse, 'teológico')}
                      >
                        Teológica
                      </button>
                      <button
                        className="submenu-item"
                        onClick={() => handleCommentSelect(contextMenu.verse, 'geográfico')}
                      >
                        Geográfica
                      </button>
                      <button
                        className="submenu-item"
                        onClick={() => handleCommentSelect(contextMenu.verse, 'paleolítico')}
                      >
                        Paleolítica
                      </button>
                      <button
                        className="submenu-item"
                        onClick={() => handleCommentSelect(contextMenu.verse, 'arqueológico')}
                      >
                        Arqueológica
                      </button>
                    </div>
                  )}
                  {concordanceSubmenu && (
                    <div className="concordance-submenu">
                      {loadingConcordance ? (
                        <div className="submenu-item">Cargando...</div>
                      ) : (
                        getConcordances(contextMenu.verse).then((related) =>
                          related.length === 0 ? (
                            <div className="submenu-item">No se encontraron concordancias</div>
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
                  <button
                    className="close-menu-button"
                    onClick={() => setContextMenu({ visible: false, verse: null })}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      padding: '5px 10px',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    X
                  </button>
                </div>
              )}
              {prayerMenu.visible && prayerMenu.verse && (
                Krause(
                  className="prayer-menu"
                  style={{
                    position: 'fixed',
                    bottom: '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: '1001',
                  }}
                >
                  <div className="prayer-menu-content">
                    <button
                      className="prayer-button"
                      onClick={recording ? stopRecording : startRecording}
                      disabled={!unlockDate}
                    >
                      {recording ? 'Detener Grabación' : 'Grabar Oración'}
                    </button>
                    <input
                      type="date"
                      value={prayerMenu.unlockDate}
                      onChange={(e) => setUnlockDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <button
                      className="close-prayer-btn"
                      onClick={() => setPrayerMenu({ visible: false, verse: null })}
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    </div>
  );
}

export default BibleReading;
