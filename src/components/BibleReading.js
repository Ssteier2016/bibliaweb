import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // Asegúrate de importar los estilos de DatePicker
import charactersData from './data/characters.json';
import './BibleReading.css';

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
  handlePrayer,
  closePrayerModal,
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
  backgroundColor,
  backgroundImage,
  fontFamily,
  fontSize,
  textColor,
  userId,
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
    const storedBooks = JSON.parse(localStorage.getItem(`completedBooks_${userId}`) || '{}');
    const storedChapters = JSON.parse(localStorage.getItem(`completedChapters_${userId}`) || '{}');
    setCompletedBooks(storedBooks);
    setCompletedChapters(storedChapters);
  }, [userId]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      audioChunksRef.current = [];
    };
  }, [isRecording]);

  const formatDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toggleBookCompletion = (bookName) => {
    if (!bookName || !userId) return;
    const newCompletedBooks = {
      ...completedBooks,
      [bookName]: {
        completed: !completedBooks[bookName]?.completed,
        date: !completedBooks[bookName]?.completed ? formatDate() : null,
      },
    };
    setCompletedBooks(newCompletedBooks);
    localStorage.setItem(`completedBooks_${userId}`, JSON.stringify(newCompletedBooks));
  };

  const toggleChapterCompletion = (bookName, chapterNumber) => {
    if (!bookName || !chapterNumber || !userId) return;
    const key = `${bookName}_${chapterNumber}`;
    const chapter = bibleData.books
      ?.find((book) => book.name === bookName)
      ?.chapters.find((ch) => ch.chapter === chapterNumber);
    if (!chapter) return;

    const newCompletedChapters = {
      ...completedChapters,
      [key]: {
        completed: !completedChapters[key]?.completed,
        date: !completedChapters[key]?.completed ? formatDate() : null,
      },
    };
    setCompletedChapters(newCompletedChapters);
    localStorage.setItem(`completedChapters_${userId}`, JSON.stringify(newCompletedChapters));

    if (!completedChapters[key]?.completed) {
      const character = charactersData.find((c) => c.chapter === `${bookName} ${chapterNumber}`);
      if (character) {
        const collection = JSON.parse(localStorage.getItem(`collection_${userId}`) || '[]');
        if (!collection.some((item) => item?.name === character.name)) {
          collection.push(character);
          localStorage.setItem(`collection_${userId}`, JSON.stringify(collection));
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
    if (selectedChapterObj && selectedBookObj?.name) {
      setSelectedChapterObj(null);
      navigate(`/reading?book=${encodeURIComponent(selectedBookObj.name)}`);
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
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
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
      alert('No se pudo iniciar la grabación. Verifica los permisos del micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const savePrayer = (verse) => {
    if (!verse || !prayerAudio || !lockDate || !userId) return;
    const prayerKey = `prayer_${verse.book}_${verse.chapter}_${verse.verse}_${userId}`;
    const lockKey = `prayer_lock_${verse.book}_${verse.chapter}_${verse.verse}_${userId}`;
    localStorage.setItem(prayerKey, prayerAudio);
    localStorage.setItem(lockKey, lockDate.getTime().toString());
    closePrayerModal();
    setPrayerAudio(null);
    setLockDate(null);
  };

  const isPrayerLocked = (verse) => {
    if (!verse) return false;
    const lockKey = `prayer_lock_${verse.book}_${verse.chapter}_${verse.verse}_${userId}`;
    const lockDateMs = localStorage.getItem(lockKey);
    return lockDateMs && Date.now() < parseInt(lockDateMs);
  };

  const verses = selectedChapterObj?.verses?.map((verse) => ({
    ...verse,
    book: selectedBookObj?.name,
    chapter: selectedChapterObj?.chapter,
  })) || [];

  if (!bibleData?.books) {
    return <div data-testid="loading">Cargando datos de la Biblia...</div>;
  }

  return (
    <div
      className="bible-reading"
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
                {completedBooks[book.name]?.date && ` - Completado el ${completedBooks[book.name].date}`}
              </span>
            </div>
          ))}
        </div>
      ) : !selectedChapterObj ? (
        <div className="chapter-list">
          <h2>Capítulos de {selectedBookObj.name}</h2>
          {selectedBookObj.chapters?.map((chapter) => (
            <div key={chapter.chapter} className="chapter-item">
              <input
                type="checkbox"
                checked={!!completedChapters[`${selectedBookObj.name}_${chapter.chapter}`]?.completed}
                onChange={() => toggleChapterCompletion(selectedBookObj.name, chapter.chapter)}
              />
              <span onClick={() => handleChapterClick(chapter)}>
                Capítulo {chapter.chapter}
                {completedChapters[`${selectedBookObj.name}_${chapter.chapter}`]?.date &&
                  ` - Completado el ${completedChapters[`${selectedBookObj.name}_${chapter.chapter}`].date}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="verse-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <h2>
            {selectedBookObj.name} {selectedChapterObj.chapter}
          </h2>
          <div className="continuous-text">
            {verses.map((verse, index) => {
              const highlightKey = `highlight_${verse.book}_${verse.chapter}_${verse.verse}_${userId}`;
              const noteKey = `note_${verse.book}_${verse.chapter}_${verse.verse}_${userId}`;
              const commentKey = `comment_${verse.book}_${verse.chapter}_${verse.verse}_${
                verseComments[`comment_${verse.book}_${verse.chapter}_${verse.verse}_type_${userId}`]?.type || 'unknown'
              }_${userId}`;
              const prayerKey = `prayer_${verse.book}_${verse.chapter}_${verse.verse}_${userId}`;
              const isSelected =
                selected東京都Verse &&
                verse.verse === selectedVerse.verse &&
                verse.book === selectedVerse.book &&
                verse.chapter === selectedVerse.chapter;
              return (
                <span
                  key={`${verse.book}_${verse.chapter}_${verse.verse}_${index}_${userId}`}
                  className={`verse ${
                    highlightedVerses[highlightKey]?.color ? `highlighted-${highlightedVerses[highlightKey].color}` : ''
                  } ${isSelected ? 'selected-verse' : ''}`}
                  onClick={() => handleVerseClick(verse)}
                  onContextMenu={(e) => handleContextMenu(e, verse)}
                  onTouchStart={(e) => handleTouchStart(e, verse)}
                >
                  <span className="verse-number">{verse.number}</span>
                  <span className="verse-text">{verse.text} </span>
                  {verseComments[commentKey]?.text && (
                    <span className="comment-wrapper">
                      <span className="comment">
                        Comentario {verseComments[commentKey].type}: {verseComments[commentKey].text}
                        {loadingComment === commentKey && ' (Cargando...)'}
                      </span>
                      <button className="comment-button" onClick={() => handleCloseComment(verse, verseComments[commentKey]?.type)}>
                        X
                      </button>
                    </span>
                  )}
                  {notes[noteKey] && <span className="note">Nota: {notes[noteKey]}</span>}
                  {localStorage.getItem(prayerKey) && (
                    <audio
                      controls
                      src={localStorage.getItem(prayerKey)}
                      style={{ marginTop: '5px', display: 'block' }}
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
                  {prayerModal.visible &&
                    prayerModal.verse &&
                    verse.verse === prayerModal.verse?.verse &&
                    verse.book === prayerModal.verse?.book &&
                    verse.chapter === prayerModal.verse?.chapter && (
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
                          zIndex: 2000,
                          borderRadius: '5px',
                          maxWidth: '90%',
                          width: '400px',
                        }}
                      >
                        <h3>Grabar Oración</h3>
                        <button
                          className="prayer-button"
                          onClick={() => (isRecording ? stopRecording() : startRecording(verse))}
                          disabled={isPrayerLocked(verse)}
                        >
                          {isRecording ? 'Detener Grabación' : 'Grabar Oración'}
                        </button>
                        {prayerAudio && (
                          <audio controls src={prayerAudio} style={{ margin: '10px 0', width: '100%' }} />
                        )}
                        <div style={{ margin: '10px 0' }}>
                          <label htmlFor="lockDate">Bloquear hasta:</label>
                          <DatePicker
                            id="lockDate"
                            selected={lockDate}
                            onChange={(date) => setLockDate(date)}
                            minDate={new Date()}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Selecciona una fecha"
                            disabled={isPrayerLocked(verse)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => savePrayer(verse)}
                            disabled={isPrayerLocked(verse)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#1976d2',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                            }}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={closePrayerModal}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#d32f2f',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                </span>
              );
            })}
          </div>
          {contextMenu.visible && contextMenu.verse && (
            <div
              className="context-menu"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              ref={contextMenuRef}
            >
              <div className="menu-item" onClick={toggleHighlightSubmenu}>
                Subrayar
                {highlightSubmenu && (
                  <div className="submenu">
                    <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'yellow')}>
                      Amarillo
                    </div>
                    <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'green')}>
                      Verde
                    </div>
                    <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'blue')}>
                      Azul
                    </div>
                    <div className="submenu-item" onClick={() => handleHighlight(contextMenu.verse, 'pink')}>
                      Rosa
                    </div>
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
                    <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'lingüístico')}>
                      Lingüístico
                    </div>
                    <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'cultural')}>
                      Cultural
                    </div>
                    <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'histórico')}>
                      Histórico
                    </div>
                    <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'teológico')}>
                      Teológico
                    </div>
                    <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'geográfico')}>
                      Geográfico
                    </div>
                    <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'paleolítico')}>
                      Paleolítico
                    </div>
                    <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'arqueológico')}>
                      Arqueológico
                    </div>
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
                      getConcordances(contextMenu.verse).then((related) =>
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
      )}
    </div>
  );
}

export default BibleReading;
