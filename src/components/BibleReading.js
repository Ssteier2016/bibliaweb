import React, { useState, useEffect } from 'react';

function BibleReading({
  bibleData,
  concordances,
  handleContextMenu,
  handleTouchStart,
  handleHighlight,
  toggleHighlight,
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
  noteInput,
  notes,
  highlightedVerses,
  highlightSubmenu,
  commentSubmenu,
  concordanceSubmenu,
  verseComments,
  loadingComment,
  contextMenuRef,
}) {
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [completedBooks, setCompletedBooks] = useState({});
  const [completedChapters, setCompletedChapters] = useState({});

  useEffect(() => {
    const storedBooks = JSON.parse(localStorage.getItem('completedBooks') || '{}');
    const storedChapters = JSON.parse(localStorage.getItem('completedChapters') || '{}');
    setCompletedBooks(storedBooks);
    setCompletedChapters(storedChapters);
  }, []);

  const toggleBookCompletion = (bookName) => {
    const newCompletedBooks = {
      ...completedBooks,
      [bookName]: !completedBooks[bookName],
    };
    setCompletedBooks(newCompletedBooks);
    localStorage.setItem('completedBooks', JSON.stringify(newCompletedBooks));
  };

  const toggleChapterCompletion = (bookName, chapterNumber) => {
    const newCompletedChapters = {
      ...completedChapters,
      [`${bookName}_${chapterNumber}`]: !completedChapters[`${bookName}_${chapterNumber}`],
    };
    setCompletedChapters(newCompletedChapters);
    localStorage.setItem('completedChapters', JSON.stringify(newCompletedChapters));
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

  return (
    <div className="bible-reading">
      <button className="back-button" onClick={handleBack} style={{ display: selectedBook ? 'block' : 'none' }}>
        ← Volver
      </button>
      {!selectedBook ? (
        <div className="book-list">
          <h2>Libros de la Biblia</h2>
          {biblieData.books.map(book => (
            <div key={book.name} className="book-item">
              <input
                type="checkbox"
                checked={!!completedBooks[book.name]}
                onChange={() => toggleBookCompletion(book.name)}
              />
              <span onClick={() => handleBookClick(book)}>{book.name}</span>
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
                checked={!!completedChapters[`${selectedBook.name}_${chapter.chapter}`]}
                onChange={() => toggleChapterCompletion(selectedBook.name, chapter.chapter)}
              />
              <span onClick={() => handleChapterClick(chapter)}>Capítulo {chapter.chapter}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="verse-list">
          <h2>{selectedBook.name} {selectedChapter.chapter}</h2>
          {selectedChapter.verses.map(verse => {
            const highlightKey = `highlight_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}`;
            const noteKey = `note_${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}`;
            const commentKey = `${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}_${verseComments[`${selectedBook.name}_${selectedChapter.chapter}_${verse.verse}_type`]?.type || 'unknown'}`;
            return (
              <div
                key={verse.verse}
                className={`verse ${highlightedVerses[highlightKey] ? `highlighted-${highlightedVerses[highlightKey].color}` : ''}`}
                onContextMenu={(e) => handleContextMenu(e, verse)}
                onTouchStart={(e) => handleTouchStart(e, verse)}
              >
                <p><strong>{verse.verse}</strong>: {verse.text}</p>
                {verseComments[commentKey] && (
                  <p className="comment-wrapper">
                    <span className="comment">
                      Comentario de {verseComments[commentKey].type}: {verseComments[commentKey].text}
                      {loadingComment === commentKey && ' (Cargando...)'}
                    </span>
                    <button className="close-comment" onClick={() => handleCloseComment(verse)}>X</button>
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
                        Lingüística
                      </div>
                      <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'cultural')}>
                        Cultural
                      </div>
                      <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'histórico')}>
                        Histórica
                      </div>
                      <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'teológico')}>
                        Teológica
                      </div>
                      <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'geográfico')}>
                        Geográfica
                      </div>
                      <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'paleolítico')}>
                        Paleolítica
                      </div>
                      <div className="submenu-item" onClick={() => handleCommentSelect(contextMenu.verse, 'arqueológico')}>
                        Arqueológica
                      </div>
                    </div>
                  )}
                </div>
                <div className="menu-item" onClick={toggleConcordanceSubmenu}>
                  Concordancia
                  {concordanceSubmenu && (
                    <div className="submenu">
                      {getConcordances(contextMenu.verse).map((related, index) => (
                        <div
                          key={index}
                          className="submenu-item"
                          onClick={() => handleConcordanceSelect(related)}
                        >
                          {related.book} {related.chapter}:{related.verse}
                        </div>
                      ))}
                      {getConcordances(contextMenu.verse).length === 0 && (
                        <div className="submenu-item">No hay concordancias</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  export default BibleReading;
}
