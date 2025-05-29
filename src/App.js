import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import BibleReading from './components/BibleReading';
import ErrorBoundary from './components/ErrorBoundary';
import bibleData from './data/bible.json';
import concordances from './data/concordances.json';
import './App.css';

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBook, setSelectedBook] = useState(searchParams.get('book') || '');
  const [selectedChapter, setSelectedChapter] = useState(Number(searchParams.get('chapter')) || 0);
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
  const [loadingConcordance, setLoadingConcordance] = useState(false);
  const contextMenuRef = useRef(null);

  useEffect(() => {
    const storedNotes = JSON.parse(localStorage.getItem('notes') || '{}');
    const storedHighlighted = JSON.parse(localStorage.getItem('highlightedVerses') || '{}');
    setNotes(storedNotes);
    setHighlightedVerses(storedHighlighted);
  }, []);

  const handleContextMenu = (e, verse) => {
    if (e) e.preventDefault();
    if (!verse) return;
    setContextMenu({ visible: true, verse });
  };

  const handleTouchStart = (e, verse) => {
    if (!verse) return;
    e.preventDefault();
    setContextMenu({ visible: true, verse });
  };

  const handleHighlight = (verse, color) => {
    if (!verse) return;
    const key = `highlight_${verse.book}_${verse.chapter}_${verse.verse}`;
    const newHighlightedVerses = {
      ...highlightedVerses,
      [key]: { color },
    };
    setHighlightedVerses(newHighlightedVerses);
    localStorage.setItem('highlightedVerses', JSON.stringify(newHighlightedVerses));
    setHighlightSubmenu(false);
  };

  const toggleHighlightSubmenu = () => {
    setHighlightSubmenu(!highlightSubmenu);
    setCommentSubmenu(false);
    setConcordanceSubmenu(false);
  };

  const handleNote = (verse) => {
    if (!verse) return;
    setNoteInput({ visible: true, verse });
    setContextMenu({ visible: false, verse: null });
  };

  const handleNoteChange = (verse, value) => {
    if (!verse) return;
    const noteKey = `note_${verse.book}_${verse.chapter}_${verse.verse}`;
    const newNotes = { ...notes, [noteKey]: value };
    setNotes(newNotes);
    localStorage.setItem('notes', JSON.stringify(newNotes));
  };

  const closeNoteInput = () => {
    setNoteInput({ visible: false, verse: null });
  };

  const handleShare = (verse) => {
    if (!verse) return;
    if (navigator.share) {
      navigator.share({
        title: `${verse.book} ${verse.chapter}:${verse.verse}`,
        text: verse.text,
        url: window.location.href,
      }).catch((error) => console.error('Error al compartir:', error));
    } else {
      alert('Compartir no es compatible con tu navegador.');
    }
    setContextMenu({ visible: false, verse: null });
  };

  const handleCommentSelect = (verse, type) => {
    if (!verse) return;
    const commentKey = `comment_${verse.book}_${verse.chapter}_${verse.verse}_${type}`;
    setLoadingComment(commentKey);
    setTimeout(() => {
      setVerseComments({
        ...verseComments,
        [commentKey]: {
          type,
          text: `Comentario de ejemplo para ${type}`,
        },
      });
      setLoadingComment(null);
    }, 1000);
    setCommentSubmenu(false);
  };

  const toggleCommentSubmenu = () => {
    setCommentSubmenu(!commentSubmenu);
    setHighlightSubmenu(false);
    setConcordanceSubmenu(false);
  };

  const handleCloseComment = (verse, type) => {
    if (!verse) return;
    const commentKey = `comment_${verse.book}_${verse.chapter}_${verse.verse}_${type}`;
    const newComments = { ...verseComments };
    delete newComments[commentKey];
    setVerseComments(newComments);
  };

  const toggleConcordanceSubmenu = () => {
    setConcordanceSubmenu(!concordanceSubmenu);
    setHighlightSubmenu(false);
    setCommentSubmenu(false);
  };

  const handleConcordanceSelect = (verse) => {
    if (!verse) return;
    setContextMenu({ visible: false, verse: null });
    setSelectedBook(verse.book);
    setSelectedChapter(verse.chapter);
    setSearchParams({ book: verse.book, chapter: verse.chapter.toString() });
  };

  const getConcordances = async (verse) => {
    if (!verse) return [];
    return new Promise((resolve) => {
      setLoadingConcordance(true);
      setTimeout(() => {
        const related = concordances.filter(
          (c) =>
            c.book === verse.book &&
            c.chapter === verse.chapter &&
            c.verse === verse.verse,
        );
        setLoadingConcordance(false);
        resolve(related);
      }, 500);
    });
  };

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              <BibleReading
                bibleData={bibleData}
                concordances={concordances}
                handleContextMenu={handleContextMenu}
                handleTouchStart={handleTouchStart}
                handleHighlight={handleHighlight}
                toggleHighlightSubmenu={toggleHighlightSubmenu}
                handleNote={handleNote}
                handleNoteChange={handleNoteChange}
                closeNoteInput={closeNoteInput}
                handleShare={handleShare}
                handleCommentSelect={handleCommentSelect}
                toggleCommentSubmenu={toggleCommentSubmenu}
                handleCloseComment={handleCloseComment}
                toggleConcordanceSubmenu={toggleConcordanceSubmenu}
                handleConcordanceSelect={handleConcordanceSelect}
                getConcordances={getConcordances}
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                noteInput={noteInput}
                setNoteInput={setNoteInput}
                notes={notes}
                setNotes={setNotes}
                highlightedVerses={highlightedVerses}
                setHighlightedVerses={setHighlightedVerses}
                highlightSubmenu={highlightSubmenu}
                setHighlightSubmenu={setHighlightSubmenu}
                commentSubmenu={commentSubmenu}
                setCommentSubmenu={setCommentSubmenu}
                concordanceSubmenu={concordanceSubmenu}
                setConcordanceSubmenu={setConcordanceSubmenu}
                verseComments={verseComments}
                setVerseComments={setVerseComments}
                loadingComment={loadingComment}
                setLoadingComment={setLoadingComment}
                loadingConcordance={loadingConcordance}
                setLoadingConcordance={setLoadingConcordance}
                contextMenuRef={contextMenuRef}
                selectedBook={selectedBook}
                setSelectedBook={setSelectedBook}
                selectedChapter={selectedChapter}
                setSelectedChapter={setSelectedChapter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isHome={true}
              />
            }
          />
          <Route
            path="/reading"
            element={
              <BibleReading
                bibleData={bibleData}
                concordances={concordances}
                handleContextMenu={handleContextMenu}
                handleTouchStart={handleTouchStart}
                handleHighlight={handleHighlight}
                toggleHighlightSubmenu={toggleHighlightSubmenu}
                handleNote={handleNote}
                handleNoteChange={handleNoteChange}
                closeNoteInput={closeNoteInput}
                handleShare={handleShare}
                handleCommentSelect={handleCommentSelect}
                toggleCommentSubmenu={toggleCommentSubmenu}
                handleCloseComment={handleCloseComment}
                toggleConcordanceSubmenu={toggleConcordanceSubmenu}
                handleConcordanceSelect={handleConcordanceSelect}
                getConcordances={getConcordances}
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                noteInput={noteInput}
                setNoteInput={setNoteInput}
                notes={notes}
                setNotes={setNotes}
                highlightedVerses={highlightedVerses}
                setHighlightedVerses={setHighlightedVerses}
                highlightSubmenu={highlightSubmenu}
                setHighlightSubmenu={setHighlightSubmenu}
                commentSubmenu={commentSubmenu}
                setCommentSubmenu={setCommentSubmenu}
                concordanceSubmenu={concordanceSubmenu}
                setConcordanceSubmenu={setConcordanceSubmenu}
                verseComments={verseComments}
                setVerseComments={setVerseComments}
                loadingComment={loadingComment}
                setLoadingComment={setLoadingComment}
                loadingConcordance={loadingConcordance}
                setLoadingConcordance={setLoadingConcordance}
                contextMenuRef={contextMenuRef}
                selectedBook={selectedBook}
                setSelectedBook={setSelectedBook}
                selectedChapter={selectedChapter}
                setSelectedChapter={setSelectedChapter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isHome={false}
              />
            }
          />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
