import React, { useState, useEffect } from 'react';
import charactersData from '../data/characters.json'; // Nuevo archivo de datos

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
  const [readVerses, setReadVerses] = useState(new Set()); // Estado para versículos leídos

  useEffect(() => {
    const storedBooks = JSON.parse(localStorage.getItem('completedBooks') || '{}');
    const storedChapters = JSON.parse(localStorage.getItem('completedChapters') || '{}');
    const storedCollection = JSON.parse(localStorage.getItem('collection') || '[]');
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
      .find(book => book.name === bookName)
      ?.chapters.find(ch => ch.chapter === chapterNumber);
    if (!chapter) return;

    // Verificar si todos los versículos han sido marcados como leídos
    if (!readVerses.size || readVerses.size < chapter.verses.length) {
      alert('Debes leer todos los versículos del capítulo antes de marcarlo como leído.');
      return;
    }

    const newCompletedChapters = {
      ...completedChapters,
      [key]: {
        completed: !completedChapters[key]?.completed,
        date: !completedChapters[key]?.completed ? formatDate() : completedChapters[key]?.date || null,
      },
    };
    setCompletedChapters(newCompletedChapters);
    localStorage.setItem('completedChapters', JSON.stringify(newCompletedChapters));

    // Desbloquear carta si el capítulo se marca como leído
    if (!completedChapters[key]?.completed) {
      const character = charactersData.find(c => c.chapter === `${bookName} ${chapterNumber}`);
      if (character) {
        const collection = JSON.parse(localStorage.getItem('collection') || '[]');
        if (!collection.some(c => c.name === character.name)) {
          collection.push(character);
          localStorage.setItem('collection', JSON.stringify(collection));
          alert(`¡Has desbloqueado la carta de ${character.name}!`);
        }
      }
    }
    setReadVerses(new Set()); // Reiniciar versículos leídos
  };

  const markVerseRead = (verseNumber) => {
    setReadVerses(prev => new Set(prev).add(verseNumber));
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setReadVerses(new Set());
  };

  const handleChapterClick = (chapter) => {
    setSelectedChapter(chapter);
    setReadVerses(new Set());
  };

  const handleBack = () => {
    if (selectedChapter) {
      setSelectedChapter(null);
      setReadVerses(new Set());
    } else if (selectedBook) {
      setSelectedBook(null);
    }
  };

  return (
    <div className="bible-reading">
      <button className="back-button" onClick={handleBack} style={{ display: selectedBook ? 'block' : 'none' }}>
        ← Volver
      </button>
      {!selectedBook ? (
        <div className="book-list">
          <h2>Libros de la Biblia</h2>
          {bibleData.books.map(book => (
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
          {selectedBook.chapters.map(chapter => (
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
        <div className="verse-list">
          <h2>{selectedBook.name} {selectedChapter.chapter}</h2>
          {selectedChapter.verses.map(verse => {
            const highlightKey = `highlight_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}`;
            const noteKey = `note_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}`;
            const commentKey = `comment_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}_${verseComments[`comment_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}_type`]?.type || 'unknown'}`;
            return (
              <div
                key={verse.verse}
                className={`verse ${highlightedVerses[highlightKey] ? `highlighted-${highlightedVerses[highlightKey].color}` : ''} ${readVerses.has(verse.verse) ? 'read' : ''}`}
                onContextMenu={(e) => {
                  handleContextMenu(e, verse);
                  console.log('Reading verse context menu:', verse);
                }}
                onTouchStart={(e) => {
                  handleTouchStart(e, verse);
                  console.log('Reading verse touch start:', verse);
                }}
                onTouchEnd={(e) => e.preventDefault()}
                onClick={() => markVerseRead(verse.verse)}
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
          {/* ... (resto del código del contextMenu sin cambios) */}
        </div>
      )}
    </div>
  );
}

export default BibleReading;
