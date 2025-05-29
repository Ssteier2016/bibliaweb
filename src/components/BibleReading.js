import React, { useState, useEffect, useRef } from 'react';
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
}) {
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [completedBooks, setCompletedBooks] = useState({});
  const [completedChapters, setCompletedChapters] = useState({});
  const [prayerMenu, setPrayerMenu] = useState({ visible: false, verse: null });
  const [prayers, setPrayers] = useState({});
  const [recording, setRecording] = useState(false);
  const [unlockDate, setUnlockDate] = useState('');
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
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
    setSelectedBook(book);
    setSelectedChapter(null);
  };

  const handleChapterClick = (chapter) => {
    setSelectedChapter(chapter);
  };

  const handleBack = () => {
    if (selectedChapter) {
      setSelectedChapter(null);
    } else if (selectedBook) {
      setSelectedBook(null);
    }
  };

  const handleVerseClick = (verse) => {
    setSelectedVerse(verse);
    setMenuVisible(true);
    setContextMenu({ visible: false });
    setPrayerMenu({ visible: false });
    setHighlightSubmenu(false);
    setCommentSubmenu(false);
    setConcordanceSubmenu(false);
  };

  const togglePrayerMenu = (verse) => {
    setPrayerMenu({
      visible: !prayerMenu.visible || prayerMenu.verse !== verse,
      verse,
    });
    setMenuVisible(false);
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
          const prayerKey = `prayer_${selectedBook.name}_${selectedChapter.chapter}_${prayerMenu.verse.verse}`;
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
          setPrayerMenu({ visible: false });
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
    const prayerKey = `prayer_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}`;
    const prayer = prayers[prayerKey];
    if (prayer) {
      const unlockDate = new Date(prayer.unlockDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (unlockDate <= today) {
        const audio = new Audio(prayer.audio);
        audio.play().catch((error) => console.error('Error playing audio:', error));
      } else {
        alert(`Oración bloqueada hasta ${prayer.unlockDate}\nGrabada el: ${prayer.recordDate}\nDuración: ${prayer.duration}s`);
      }
    }
  };

  return (
    <div className="bible-reading">
      <button
        className="back-button"
        onClick={handleBack}
        style={{ display: selectedBook ? 'block' : 'none' }}
      >
        ← Volver
      </button>
      {!selectedBook ? (
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
      ) : !selectedChapter ? (
        <div className="chapter-list">
          <h2>Capítulos de {selectedBook.name}</h2>
          {selectedBook.chapters.map((chapter) => (
            <div key={chapter.chapter} className="chapter-item">
              <input
                type="checkbox"
                checked={!!completedChapters[`${selectedBook.name}_${chapter.chapter}`]?.completed}
                onChange={() => toggleChapterCompletion(selectedBook.name, chapter.chapter)}
              />
              <span onClick={() => handleChapterClick(chapter)}>
                Capítulo {chapter.chapter}
                {completedChapters[`${selectedBook.name}_${chapter.chapter}`]?.date &&
                  ` - Marcado el ${completedChapters[`${selectedBook.name}_${chapter.chapter}`].date}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="verse-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <h2>
            {selectedBook.name} {selectedChapter.chapter}
          </h2>
          {selectedChapter.verses.map((verse) => {
            const highlightKey = `highlight_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}`;
            const noteKey = `note_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}`;
            const commentKey = `comment_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}_${verseComments[`comment_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}_type`]?.type || 'unknown'}`;
            const prayerKey = `prayer_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}`;
            const isSelected = selectedVerse?.verse === verse.verse;
            return (
              <div
                key={verse.verse}
                className={`verse ${highlightedVerses[highlightKey] ? `highlighted-${highlightedVerses[highlightKey].color}` : ''} ${isSelected ? 'selected-verse' : ''}`}
                onClick={() => handleVerseClick(verse)}
                onTouchStart={() => handleVerseClick(verse)}
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
                      fontSize: '12px',
                    }}
                  >
                    ▶️🔒
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
                {noteInput.visible && noteInput.verse?.verse === verse.verse && (
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
          {menuVisible && selectedVerse && (
            <div className="slide-menu">
              <div className="menu-buttons">
                <button
                  className="menu-button"
                  onClick={() => toggleHighlightSubmenu()}
                >
                  <img src="/assets/icons/subrayar.png" alt="Subrayar" />
                </button>
                <button
                  className="menu-button"
                  onClick={() => handleNote(selectedVerse)}
                >
                  <img src="/assets/icons/anotar.png" alt="Anotar" />
                </button>
                <button
                  className="menu-button"
                  onClick={() => handleShare(selectedVerse)}
                >
                  <img src="/assets/icons/compartir.png" alt="Compartir" />
                </button>
                <button
                  className="menu-button"
                  onClick={() => toggleCommentSubmenu()}
                >
                  <img src="/assets/icons/comentarios.png" alt="Comentarios" />
                </button>
                <button
                  className="menu-button"
                  onClick={() => toggleConcordanceSubmenu()}
                >
                  <img src="/assets/icons/concordancia.png" alt="Concordancia" />
                </button>
                <button
                  className="menu-button"
                  onClick={() => togglePrayerMenu(selectedVerse)}
                >
                  <img src="/assets/icons/oracion.png" alt="Oración" />
                </button>
              </div>
              {highlightSubmenu && (
                <div className="color-submenu">
                  <button
                    className="color-button"
                    onClick={() => handleHighlight(selectedVerse, 'red')}
                  >
                    <img src="/assets/icons/rojo.png" alt="Rojo" />
                  </button>
                  <button
                    className="color-button"
                    onClick={() => handleHighlight(selectedVerse, 'green')}
                  >
                    <img src="/assets/icons/verde.png" alt="Verde" />
                  </button>
                  <button
                    className="color-button"
                    onClick={() => handleHighlight(selectedVerse, 'pink')}
                  >
                    <img src="/assets/icons/rosa.png" alt="Rosa" />
                  </button>
                  <button
                    className="color-button"
                    onClick={() => handleHighlight(selectedVerse, 'cyan')}
                  >
                    <img src="/assets/icons/celeste.png" alt="Celeste" />
                  </button>
                  <button
                    className="color-button"
                    onClick={() => handleHighlight(selectedVerse, 'blue')}
                  >
                    <img src="/assets/icons/azul.png" alt="Azul" />
                  </button>
                  <button
                    className="color-button"
                    onClick={() => handleHighlight(selectedVerse, 'purple')}
                  >
                    <img src="/assets/icons/violeta.png" alt="Violeta" />
                  </button>
                  <button
                    className="color-button"
                    onClick={() => handleHighlight(selectedVerse, 'yellow')}
                  >
                    <img src="/assets/icons/amarillo.png" alt="Amarillo" />
                  </button>
                </div>
              )}
              {commentSubmenu && (
                <div className="comment-submenu">
                  <button
                    className="comment-button"
                    onClick={() => handleCommentSelect(selectedVerse, 'lingüístico')}
                  >
                    Lingüística
                  </button>
                  <button
                    className="comment-button"
                    onClick={() => handleCommentSelect(selectedVerse, 'cultural')}
                  >
                    Cultural
                  </button>
                  <button
                    className="comment-button"
                    onClick={() => handleCommentSelect(selectedVerse, 'histórico')}
                  >
                    Histórica
                  </button>
                  <button
                    className="comment-button"
                    onClick={() => handleCommentSelect(selectedVerse, 'teológico')}
                  >
                    Teológica
                  </button>
                  <button
                    className="comment-button"
                    onClick={() => handleCommentSelect(selectedVerse, 'geográfico')}
                  >
                    Geográfica
                  </button>
                  <button
                    className="comment-button"
                    onClick={() => handleCommentSelect(selectedVerse, 'paleolítico')}
                  >
                    Paleolítica
                  </button>
                  <button
                    className="comment-button"
                    onClick={() => handleCommentSelect(selectedVerse, 'arqueológico')}
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
                    getConcordances(selectedVerse).then((related) =>
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
          )}
          {prayerMenu.visible && prayerMenu.verse && (
            <div
              className="prayer-menu"
              style={{ position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}
            >
              <div className="prayer-menu-content">
                <button
                  className="record-button"
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
                  onClick={() => setPrayerMenu({ visible: false })}
                >
                  X
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BibleReading;
