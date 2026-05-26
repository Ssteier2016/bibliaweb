import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { COMMENTARY } from './data/commentary';
import AuthScreen from './AuthScreen';
import UserMenu   from './UserMenu';
import { onAuthChange, loadUserData, saveUserData } from './firebase';

const BOOK_NAMES = {
  gn:'Génesis', ex:'Éxodo', lv:'Levítico', nm:'Números', dt:'Deuteronomio',
  js:'Josué', jud:'Jueces', rt:'Rut', '1sm':'1 Samuel', '2sm':'2 Samuel',
  '1kgs':'1 Reyes', '2kgs':'2 Reyes', '1ch':'1 Crónicas', '2ch':'2 Crónicas',
  ezr:'Esdras', ne:'Nehemías', et:'Ester', job:'Job', ps:'Salmos',
  prv:'Proverbios', ec:'Eclesiastés', so:'Cantares', is:'Isaías',
  jr:'Jeremías', lm:'Lamentaciones', ez:'Ezequiel', dn:'Daniel',
  ho:'Oseas', jl:'Joel', am:'Amós', ob:'Abdías', jn:'Jonás',
  mi:'Miqueas', na:'Nahúm', hk:'Habacuc', zp:'Sofonías', hg:'Hageo',
  zc:'Zacarías', ml:'Malaquías', mt:'Mateo', mk:'Marcos', lk:'Lucas',
  jo:'Juan', act:'Hechos', rm:'Romanos', '1co':'1 Corintios',
  '2co':'2 Corintios', gl:'Gálatas', eph:'Efesios', ph:'Filipenses',
  cl:'Colosenses', '1ts':'1 Tesalonicenses', '2ts':'2 Tesalonicenses',
  '1tm':'1 Timoteo', '2tm':'2 Timoteo', tt:'Tito', phm:'Filemón',
  hb:'Hebreos', jm:'Santiago', '1pe':'1 Pedro', '2pe':'2 Pedro',
  '1jo':'1 Juan', '2jo':'2 Juan', '3jo':'3 Juan', jd:'Judas', re:'Apocalipsis',
};

const HIGHLIGHT_COLORS = [
  { id: 'yellow', hex: '#fef08a', label: 'Amarillo' },
  { id: 'green',  hex: '#bbf7d0', label: 'Verde'    },
  { id: 'blue',   hex: '#bae6fd', label: 'Azul'     },
  { id: 'pink',   hex: '#fecdd3', label: 'Rosa'     },
  { id: 'orange', hex: '#fed7aa', label: 'Naranja'  },
  { id: 'purple', hex: '#e9d5ff', label: 'Morado'   },
];

const COMMENT_TYPES = [
  { key: 'historico',      label: 'Historia',       icon: '📜' },
  { key: 'linguistico',    label: 'Lingüístico',    icon: '🗣️' },
  { key: 'paleontologico', label: 'Paleontológico', icon: '🦕' },
  { key: 'arquitectonico', label: 'Arquitectónico', icon: '🏛️' },
  { key: 'cientifico',     label: 'Científico',     icon: '🔬' },
  { key: 'comentarios',    label: 'Comentarios',    icon: '💬' },
];

function convertBible(raw) {
  return raw.map(book => ({
    name: BOOK_NAMES[book.abbrev] || book.abbrev,
    chapters: book.chapters.map((verses, ci) => ({
      chapter: ci + 1,
      verses: verses.map((text, vi) => ({ verse: vi + 1, text })),
    })),
  }));
}

function lsGet(key) { try { return localStorage.getItem(key) } catch { return null } }
function lsSet(key, val) { try { localStorage.setItem(key, val) } catch {} }

// Convierte estado interno (con prefijos) a objeto Firestore (sin prefijos)
function toFirestore(highlights, notes, bookmarks, shared) {
  const hl = {}, nt = {}, bm = {}, sh = {};
  Object.entries(highlights).forEach(([k, v]) => { if (k.startsWith('hl_'))   hl[k.slice(3)]  = v; });
  Object.entries(notes)     .forEach(([k, v]) => { if (k.startsWith('note_')) nt[k.slice(5)]  = v; });
  Object.entries(bookmarks) .forEach(([k, v]) => { if (k.startsWith('bm_'))   bm[k.slice(3)]  = v; });
  Object.entries(shared)    .forEach(([k, v]) => { if (k.startsWith('sh_'))   sh[k.slice(3)]  = v; });
  return { highlights: hl, notes: nt, bookmarks: bm, shared: sh };
}

// Convierte datos Firestore a estado interno (con prefijos)
function fromFirestore(data) {
  const hl = {}, nt = {}, bm = {}, sh = {};
  Object.entries(data.highlights || {}).forEach(([k, v]) => { hl[`hl_${k}`]   = v; });
  Object.entries(data.notes      || {}).forEach(([k, v]) => { nt[`note_${k}`] = v; });
  Object.entries(data.bookmarks  || {}).forEach(([k, v]) => { bm[`bm_${k}`]   = v; });
  Object.entries(data.shared     || {}).forEach(([k, v]) => { sh[`sh_${k}`]   = v; });
  return { hl, nt, bm, sh };
}

// ── Íconos SVG ────────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

function HighlightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return filled ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
    </svg>
  );
}

function ReferenceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/>
      <circle cx="6" cy="12" r="3"/>
      <circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}

function CommentaryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}

// ── VerseCard ─────────────────────────────────────────────────────────────────

function VerseCard({ verse, bookName, chapter, highlight, note, bookmark, onHighlight, onNote, onBookmark, onShare }) {
  const [showActions,    setShowActions]    = useState(false);
  const [showColors,     setShowColors]     = useState(false);
  const [showNote,       setShowNote]       = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [activeTab,      setActiveTab]      = useState(null);
  const [noteVal,        setNoteVal]        = useState(note || '');
  const [copied,         setCopied]         = useState(false);

  const commentKey  = `${bookName}_${chapter}_${verse.verse}`;
  const verseData   = COMMENTARY[commentKey];
  const allTabs     = verseData ? COMMENT_TYPES.filter(t => verseData[t.key]) : [];
  const nonRefTabs  = allTabs.filter(t => t.key !== 'referencia');
  const hasRef      = !!verseData?.referencia;
  const hasCommentary = nonRefTabs.length > 0;

  useEffect(() => { setNoteVal(note || '') }, [note]);

  function handleReference() {
    const alreadyOpen = showCommentary && activeTab === 'referencia';
    if (alreadyOpen) { setShowCommentary(false); }
    else { setActiveTab('referencia'); setShowCommentary(true); }
    setShowColors(false); setShowNote(false);
  }

  function handleCommentary() {
    const alreadyOpen = showCommentary && activeTab !== 'referencia';
    if (alreadyOpen) { setShowCommentary(false); }
    else { setActiveTab(nonRefTabs[0]?.key || null); setShowCommentary(true); }
    setShowColors(false); setShowNote(false);
  }

  function handleNoteBlur() { onNote(verse.verse, noteVal); }

  async function handleShare() {
    const text = `${bookName} ${chapter}:${verse.verse}\n"${verse.text}"\n— Biblia Reina-Valera`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${bookName} ${chapter}:${verse.verse}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      onShare?.(verse.verse);
    } catch {}
  }

  const bgColor = highlight ? HIGHLIGHT_COLORS.find(c => c.id === highlight)?.hex : undefined;
  const highlightStyle = bgColor ? { backgroundColor: bgColor, borderRadius: '10px' } : {};

  return (
    <div className="verse-card">
      <div className="verse-body" style={highlightStyle}>
        <div className="verse-text-row">
          <span className="verse-num">{verse.verse}</span>
          <span className="verse-text">{verse.text}</span>
          <button
            className={`expand-btn ${showActions ? 'open' : ''}`}
            onClick={() => setShowActions(v => !v)}
            title="Opciones"
          >
            <ChevronIcon />
          </button>
        </div>
      </div>

      {note && !showNote && (
        <div className="existing-note">📝 {note}</div>
      )}

      {showActions && (
        <div className="verse-actions">
          <button
            className={`icon-btn ${highlight ? 'active' : ''}`}
            onClick={() => { setShowColors(v => !v); setShowNote(false); setShowCommentary(false); }}
            title="Subrayar"
          >
            <HighlightIcon />
          </button>

          <button
            className={`icon-btn ${(note || showNote) ? 'active' : ''}`}
            onClick={() => { setShowNote(v => !v); setShowColors(false); setShowCommentary(false); }}
            title={note ? 'Ver nota' : 'Agregar nota'}
          >
            <NoteIcon />
          </button>

          <button
            className={`icon-btn ${bookmark ? 'active bookmark-active' : ''}`}
            onClick={() => onBookmark(verse.verse)}
            title={bookmark ? 'Quitar marcador' : 'Guardar'}
          >
            <BookmarkIcon filled={!!bookmark} />
          </button>

          <button
            className={`icon-btn ${showCommentary && activeTab === 'referencia' ? 'active' : ''}`}
            onClick={handleReference}
            title="Referencias cruzadas"
          >
            <ReferenceIcon />
          </button>

          <button
            className={`icon-btn ${copied ? 'active' : ''}`}
            onClick={handleShare}
            title={copied ? '¡Copiado!' : 'Compartir'}
          >
            <ShareIcon />
          </button>

          {hasCommentary && (
            <button
              className={`icon-btn ${showCommentary && activeTab !== 'referencia' ? 'active' : ''}`}
              onClick={handleCommentary}
              title="Comentario"
            >
              <CommentaryIcon />
            </button>
          )}
        </div>
      )}

      {showColors && (
        <div className="color-picker">
          <span className="color-label">Color:</span>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              className={`color-dot ${highlight === c.id ? 'selected' : ''}`}
              style={{ backgroundColor: c.hex }}
              title={c.label}
              onClick={() => {
                onHighlight(verse.verse, highlight === c.id ? null : c.id);
                if (highlight === c.id) setShowColors(false);
              }}
            />
          ))}
          {highlight && (
            <button className="remove-color-btn" onClick={() => { onHighlight(verse.verse, null); setShowColors(false); }}>
              ✕ Quitar
            </button>
          )}
        </div>
      )}

      {showNote && (
        <div className="note-panel">
          <textarea
            className="note-textarea"
            placeholder="Escribe tu nota sobre este versículo…"
            value={noteVal}
            onChange={e => setNoteVal(e.target.value)}
            onBlur={handleNoteBlur}
            autoFocus
          />
          <div className="note-saved">
            {noteVal.trim() ? '✓ Se guarda automáticamente' : 'Escribe para guardar'}
          </div>
        </div>
      )}

      {showCommentary && (
        <div className="commentary-panel">
          {activeTab === 'referencia' ? (
            <div className="commentary-content">
              <div className="commentary-content-label">📖 Referencias cruzadas</div>
              {hasRef
                ? verseData.referencia
                : <span className="no-ref-text">Sin referencias cruzadas disponibles.</span>
              }
              {hasCommentary && (
                <button className="see-commentary-link" onClick={() => setActiveTab(nonRefTabs[0]?.key)}>
                  Ver comentario completo →
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="commentary-tabs">
                {nonRefTabs.map(t => (
                  <button
                    key={t.key}
                    className={`commentary-tab ${activeTab === t.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
                {hasRef && (
                  <button className="commentary-tab" onClick={() => setActiveTab('referencia')}>
                    📖 Ref.
                  </button>
                )}
              </div>
              {activeTab && verseData?.[activeTab] && (
                <div className="commentary-content">
                  <div className="commentary-content-label">
                    {COMMENT_TYPES.find(t => t.key === activeTab)?.icon}{' '}
                    {COMMENT_TYPES.find(t => t.key === activeTab)?.label}
                  </div>
                  {verseData[activeTab]}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Avatar del usuario ────────────────────────────────────────────────────────

function UserAvatar({ user, onClick }) {
  const isGuest = !user || user.isAnonymous;
  if (user?.photoURL) {
    return (
      <button className="avatar-btn" onClick={onClick} title="Mi perfil">
        <img src={user.photoURL} alt="avatar" className="avatar-img" />
      </button>
    );
  }
  return (
    <button className="avatar-btn" onClick={onClick} title="Mi perfil">
      <span className="avatar-initials">
        {isGuest ? '👤' : (user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()}
      </span>
    </button>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [user,            setUser]           = useState(undefined); // undefined = cargando
  const [books,           setBooks]          = useState([]);
  const [bibleLoading,    setBibleLoading]   = useState(true);
  const [darkMode,        setDarkMode]       = useState(() => {
    const saved = lsGet('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [selectedBook,    setSelectedBook]   = useState('');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [searchQuery,     setSearchQuery]    = useState('');
  const [highlights,      setHighlights]     = useState({});
  const [notes,           setNotes]          = useState({});
  const [bookmarks,       setBookmarks]      = useState({});
  const [shared,          setShared]         = useState({});
  const [showMenu,        setShowMenu]       = useState(false);

  // Aplicar tema
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    lsSet('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Cargar Biblia
  useEffect(() => {
    fetch('/es_rvr.json')
      .then(r => r.json())
      .then(raw => {
        const converted = convertBible(raw);
        setBooks(converted);
        setSelectedBook(converted[0]?.name || '');
        setBibleLoading(false);
      })
      .catch(() => setBibleLoading(false));
  }, []);

  // Auth state
  useEffect(() => {
    return onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && !firebaseUser.isAnonymous) {
        const data = await loadUserData(firebaseUser.uid);
        const { hl, nt, bm, sh } = fromFirestore(data);
        setHighlights(hl); setNotes(nt); setBookmarks(bm); setShared(sh);
      } else {
        // Invitado → cargar desde localStorage
        const hl = {}, nt = {}, bm = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith('hl_'))   hl[k] = lsGet(k);
          if (k?.startsWith('note_')) nt[k] = lsGet(k);
          if (k?.startsWith('bm_'))   bm[k] = lsGet(k);
        }
        setHighlights(hl); setNotes(nt); setBookmarks(bm); setShared({});
      }
    });
  }, []);

  // Sincronizar con Firestore cuando cambia el usuario
  async function syncFirestore(hl, nt, bm, sh, uid) {
    if (!uid) return;
    await saveUserData(uid, toFirestore(hl, nt, bm, sh));
  }

  const isCloud = user && !user.isAnonymous;

  const book         = books.find(b => b.name === selectedBook);
  const chapter      = book?.chapters.find(c => c.chapter === selectedChapter);
  const verses       = (chapter?.verses || []).filter(v =>
    !searchQuery.trim() || v.text.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalChapters = book?.chapters.length || 1;

  function changeBook(name) {
    setSelectedBook(name); setSelectedChapter(1); setSearchQuery('');
  }
  function changeChapter(n) {
    setSelectedChapter(n); setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleHighlight = useCallback((verseNum, colorId) => {
    const key = `hl_${selectedBook}_${selectedChapter}_${verseNum}`;
    let newHl;
    if (colorId) {
      lsSet(key, colorId);
      newHl = { ...highlights, [key]: colorId };
    } else {
      localStorage.removeItem(key);
      newHl = { ...highlights }; delete newHl[key];
    }
    setHighlights(newHl);
    if (isCloud) syncFirestore(newHl, notes, bookmarks, shared, user.uid);
  }, [selectedBook, selectedChapter, highlights, notes, bookmarks, shared, user, isCloud]);

  const handleNote = useCallback((verseNum, text) => {
    const key = `note_${selectedBook}_${selectedChapter}_${verseNum}`;
    let newNt;
    if (text?.trim()) {
      lsSet(key, text);
      newNt = { ...notes, [key]: text };
    } else {
      localStorage.removeItem(key);
      newNt = { ...notes }; delete newNt[key];
    }
    setNotes(newNt);
    if (isCloud) syncFirestore(highlights, newNt, bookmarks, shared, user.uid);
  }, [selectedBook, selectedChapter, highlights, notes, bookmarks, shared, user, isCloud]);

  const handleBookmark = useCallback((verseNum) => {
    const key = `bm_${selectedBook}_${selectedChapter}_${verseNum}`;
    let newBm;
    if (bookmarks[key]) {
      localStorage.removeItem(key);
      newBm = { ...bookmarks }; delete newBm[key];
    } else {
      lsSet(key, '1');
      newBm = { ...bookmarks, [key]: '1' };
    }
    setBookmarks(newBm);
    if (isCloud) syncFirestore(highlights, notes, newBm, shared, user.uid);
  }, [selectedBook, selectedChapter, highlights, notes, bookmarks, shared, user, isCloud]);

  const handleShare = useCallback((verseNum) => {
    const key = `sh_${selectedBook}_${selectedChapter}_${verseNum}`;
    const newSh = { ...shared, [key]: new Date().toISOString() };
    setShared(newSh);
    if (isCloud) syncFirestore(highlights, notes, bookmarks, newSh, user.uid);
  }, [selectedBook, selectedChapter, highlights, notes, bookmarks, shared, user, isCloud]);

  // ── Loading / Auth ──────────────────────────────────────────────────────────

  const authLoading = user === undefined;
  const loading = authLoading || bibleLoading;

  if (loading) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="loader">
          <div className="loader-icon">✝️</div>
          <div>Cargando Bibl.ia…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen darkMode={darkMode} />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <header className="header">
        <div className="header-title">
          <span>✝️</span>
          Bibl.ia
        </div>
        <div className="header-actions">
          <button
            className="theme-btn"
            onClick={() => setDarkMode(v => !v)}
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <UserAvatar user={user} onClick={() => setShowMenu(true)} />
        </div>
      </header>

      <nav className="nav-bar">
        <div className="nav-selects">
          <select className="nav-select" value={selectedBook} onChange={e => changeBook(e.target.value)}>
            {books.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          <select className="nav-select" value={selectedChapter} onChange={e => changeChapter(Number(e.target.value))}>
            {book?.chapters.map(c => (
              <option key={c.chapter} value={c.chapter}>Capítulo {c.chapter}</option>
            ))}
          </select>
        </div>
        <div className="nav-chapter-bar">
          <button className="nav-btn" disabled={selectedChapter <= 1} onClick={() => changeChapter(selectedChapter - 1)}>
            ← Anterior
          </button>
          <span className="nav-chapter-label">
            {selectedBook} · {selectedChapter} / {totalChapters}
          </span>
          <button className="nav-btn" disabled={selectedChapter >= totalChapters} onClick={() => changeChapter(selectedChapter + 1)}>
            Siguiente →
          </button>
        </div>
      </nav>

      <div className="search-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Buscar en este capítulo…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="verses-container">
        <div className="chapter-title">
          <h2>{selectedBook}</h2>
          <p>Capítulo {selectedChapter} — {chapter?.verses.length || 0} versículos</p>
        </div>

        {verses.length === 0 ? (
          <div className="no-results">
            {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Capítulo sin versículos'}
          </div>
        ) : (
          verses.map(verse => {
            const hlKey   = `hl_${selectedBook}_${selectedChapter}_${verse.verse}`;
            const noteKey = `note_${selectedBook}_${selectedChapter}_${verse.verse}`;
            const bmKey   = `bm_${selectedBook}_${selectedChapter}_${verse.verse}`;
            return (
              <VerseCard
                key={verse.verse}
                verse={verse}
                bookName={selectedBook}
                chapter={selectedChapter}
                highlight={highlights[hlKey] || null}
                note={notes[noteKey] || ''}
                bookmark={!!bookmarks[bmKey]}
                onHighlight={handleHighlight}
                onNote={handleNote}
                onBookmark={handleBookmark}
                onShare={handleShare}
              />
            );
          })
        )}
      </div>

      {showMenu && (
        <UserMenu
          user={user}
          books={books}
          bookmarks={bookmarks}
          highlights={highlights}
          notes={notes}
          shared={shared}
          onClose={() => setShowMenu(false)}
          onNavigate={(bookName, chapterNum) => {
            changeBook(bookName);
            setTimeout(() => changeChapter(chapterNum), 50);
          }}
        />
      )}
    </div>
  );
}
