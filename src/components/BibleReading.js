import React, { useState, useEffect } from 'react';
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
  const [readVerses, setReadVerses] = useState(new Set());

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
    setCompletedBooks(newCompletedBooks);
    localStorage.setItem('completedChapters', JSON.stringify(newCompletedChapters));

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
    setReadVerses(new Set());
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
          {contextMenu.visible && contextMenu.verse && (
            <div
              className="context-menu"
              style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed', zIndex: 1000 }}
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
              <div className="menu-item" onClick={toggleConcordanceSubmenu}>
                Concordancia
                {concordanceSubmenu && (
                  <div className="submenu">
                    {loadingConcordance ? (
                      <div className="submenu-item">Cargando...</div>
                    ) : (
                      getConcordances(contextMenu.verse).then(related =>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BibleReading;
