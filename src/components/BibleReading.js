import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import charactersData from '../data/characters.json';

function BibleReading({
  bibleData,
  handleContextMenu,
  handleTouchStart,
  handleHighlight,
  toggleHighlightSubmenu,
  handleNote,
  handleNoteChange,
  closeNoteInput,
  handleShare,
  handlePrayer,
  closePrayerModal,
  handleConcordance,
  contextMenu,
  setContextMenu,
  noteInput,
  setNoteInput,
  prayerModal,
  setPrayerModal,
  notes,
  setNotes,
  highlightedVerses,
  setHighlightedVerses,
  highlightSubmenu,
  setHighlightSubmenu,
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
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [prayerAudio, setPrayerAudio] = useState(null);
  const [lockDate, setLockDate] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedBooks = JSON.parse(localStorage.getItem('completedBooks') || '{}');
    const storedChapters = JSON.parse(localStorage.getItem('completedChapters') || '{}');
    setCompletedBooks(storedBooks);
    setCompletedChapters(storedChapters);
  }, []);

  const formatDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toggleBookCompletion = (bookName) => {
    if (!bookName) return;
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
    if (!bookName || !chapterNumber) return;
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
    navigate(book.name ? `/reading?book=${encodeURIComponent(book.name)}` : '/reading');
  };

  const handleChapterClick = (chapter) => {
    if (!chapter?.chapter || !selectedBookObj?.name) return;
    setSelectedChapterObj(chapter);
    navigate(
      selectedBookObj.name && chapter.chapter
        ? `/reading?book=${encodeURIComponent(selectedBookObj.name)}&chapter=${chapter.chapter}`
        : '/reading'
    );
  };

  const handleBack = () => {
    if (selectedChapterObj && selectedBookObj?.name) {
      setSelectedChapterObj(null);
      navigate(selectedBookObj.name ? `/reading?book=${encodeURIComponent(selectedBookObj.name)}` : '/reading');
    } else if (selectedBookObj) {
      setSelectedBookObj(null);
      navigate('/reading');
    }
  };

  const handleVerseClick = (verse) => {
    if (!verse) return;
    setSelectedVerse(verse);
    handleContextMenu(null, verse);
  };

  const startRecording = async (verse) => {
    if (!verse) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setPrayerAudio(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      alert('No se pudo iniciar la grabación. Verifica los permisos de micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const savePrayer = (verse) => {
    if (!verse || !prayerAudio || !lockDate) {
      alert('Graba una oración y selecciona una fecha.');
      return;
    }
    const prayerKey = `prayer_${verse.book}_${verse.chapter}_${verse.verse}`;
    const lockKey = `prayer_lock_${verse.book}_${verse.chapter}_${verse.verse}`;
    localStorage.setItem(prayerKey, prayerAudio);
    localStorage.setItem(lockKey, lockDate.getTime().toString());
    closePrayerModal();
    setPrayerAudio(null);
    setLockDate(null);
  };

  const isPrayerLocked = (verse) => {
    if (!verse) return false;
    const lockKey = `prayer_lock_${verse.book}_${verse.chapter}_${verse.verse}`;
    const lockDateMs = localStorage.getItem(lockKey);
    return lockDateMs && Date.now() < parseInt(lockDateMs);
  };

  const searchVerses = () => {
    if (!searchQuery?.trim()) {
      const book = bibleData.books.find((b) => b.name === selectedBook);
      const chapter = book?.chapters?.find((c) => c.chapter === selectedChapter);
      return (
        chapter?.verses?.map((verse) => ({
          ...verse,
          book: book?.name,
          chapter: chapter?.chapter,
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
            <select value={selectedBook || ''} onChange={(e) => setSelectedBook(e.target.value)}>
              <option value="">Selecciona un libro</option>
              {bibleData.books.map((book) => (
                <option key={book.name} value={book.name}>
                  {book.name}
                </option>
              ))}
            </select>
            <select value={selectedChapter || ''} onChange={(e) => setSelectedChapter(Number(e.target.value))}>
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
                  <p style={{ margin: '0', padding: '0 20px' }}>
                    <strong>
                      {verse.book} {verse.chapter}:{verse.verse}
                    </strong>
                    : {verse.text}
                  </p>
                  {notes[noteKey] && <p className="note">Nota: {notes[noteKey]}</p>}
                  {localStorage.getItem(prayerKey) && (
                    <audio
                      controls
                      src={localStorage.getItem(prayerKey)}
                      style={{ marginTop: '5px' }}
                      disabled={isPrayerLocked(verse)}
                    />
                  )}
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
                  <button className="menu-button" onClick={() => handleConcordance(contextMenu.verse)}>
                    <img src="/assets/icons/concordancia.png" alt="Concordancia" />
                  </button>
                  <button className="menu-button" onClick={() => handlePrayer(contextMenu.verse)}>
                    <img src="/assets/icons/orar.png" alt="Orar" />
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
                    <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'yellow')}>
                      <img src="/assets/icons/amarillo.png" alt="Amarillo" />
                    </button>
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
            {prayerModal.visible && prayerModal.verse && (
              <div
                className="prayer-modal"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'white',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  zIndex: '2000',
                  borderRadius: '5px',
                  maxWidth: '90%',
                  width: '400px',
                }}
              >
                <h3>Grabar Oración</h3>
                <button
                  className="prayer-button"
                  onClick={() => (isRecording ? stopRecording() : startRecording(prayerModal.verse))}
                  disabled={isPrayerLocked(prayerModal.verse)}
                >
                  {isRecording ? 'Detener Grabación' : 'Grabar Oración'}
                </button>
                {prayerAudio && <audio controls src={prayerAudio} style={{ margin: '10px 0', width: '100%' }} />}
                <div style={{ margin: '10px 0' }}>
                  <label>Bloquear hasta:</label>
                  <DatePicker
                    selected={lockDate}
                    onChange={(date) => setLockDate(date)}
                    minDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Selecciona una fecha"
                    disabled={isPrayerLocked(prayerModal.verse)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => savePrayer(prayerModal.verse)}
                    disabled={isPrayerLocked(prayerModal.verse)}
                    style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={closePrayerModal}
                    style={{ padding: '5px 10px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '3px' }}
                  >
                    Cancelar
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
                    <p style={{ margin: '0', padding: '0 20px' }}>
                      <strong>{verse.verse}</strong>: {verse.text}
                    </p>
                    {notes[noteKey] && <p className="note">Nota: {notes[noteKey]}</p>}
                    {localStorage.getItem(prayerKey) && (
                      <audio
                        controls
                        src={localStorage.getItem(prayerKey)}
                        style={{ marginTop: '5px' }}
                        disabled={isPrayerLocked(verse)}
                      />
                    )}
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
                    <button className="menu-button" onClick={() => handleConcordance(contextMenu.verse)}>
                      <img src="/assets/icons/concordancia.png" alt="Concordancia" />
                    </button>
                    <button className="menu-button" onClick={() => handlePrayer(contextMenu.verse)}>
                      <img src="/assets/icons/orar.png" alt="Orar" />
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
                      <button className="color-button" onClick={() => handleHighlight(contextMenu.verse, 'yellow')}>
                        <img src="/assets/icons/amarillo.png" alt="Amarillo" />
                      </button>
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
              ))}
              {prayerModal.visible && prayerModal.verse && (
                <div
                  className="prayer-modal"
                  className="prayer-modal",
                  style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'white',
                    padding: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    zIndex: '2000',
                    borderRadius: '5px',
                    maxWidth: '90%',
                    width: '400px',
                  }}
                >
                  <h3>Grabar Oración</h3>
                  <button
                    className="prayer-button"
                    onClick={() => (isRecording ? stopRecording() : startRecording(prayerModal?.verse))}
                    disabled={isPrayerLocked(prayerModal?.verse)}
                    >
                    {isRecording ? 'Detener Grabación' : 'Grabar Oración'}
                  </button>
                  {prayerAudio && <audio controls src={prayerAudio} style={{ margin: '10px 0', width: '100%' }} />}
                  <div style={{ margin: '10px 0' }}>
                    <label>Bloquear hasta:</label>
                    <DatePicker
                      selected={lockDate}
                      onChange={(date) => setLockDate(date)}
                      minDate={new Date()}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Selecciona una fecha"
                      disabled={isPrayerLocked(prayerModal?.verse)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => savePrayer(prayerModal?.verse)}
                      disabled={isPrayerLocked(prayerModal?.verse)}
                      style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
                    >
                      Guardar
                    </button>
                    <button
                      onClick={closePrayerModal}
                      style={{ padding: '5px 10px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '3px' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )};
}

export default BibleReading;
