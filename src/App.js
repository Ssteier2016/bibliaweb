import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { COMMENTARY } from './data/commentary';
import AuthScreen    from './AuthScreen';
import UserMenu      from './UserMenu';
import CommentsPanel from './CommentsPanel';
import { onAuthChange, loadUserData, saveUserData, savePresence, followUser, unfollowUser, updateReadingStreak, incrementLike, loadChapterLikes } from './firebase';

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

const BIBLEHUB_BOOK = {
  'Génesis':'genesis','Éxodo':'exodus','Levítico':'leviticus','Números':'numbers',
  'Deuteronomio':'deuteronomy','Josué':'joshua','Jueces':'judges','Rut':'ruth',
  '1 Samuel':'1_samuel','2 Samuel':'2_samuel','1 Reyes':'1_kings','2 Reyes':'2_kings',
  '1 Crónicas':'1_chronicles','2 Crónicas':'2_chronicles','Esdras':'ezra',
  'Nehemías':'nehemiah','Ester':'esther','Job':'job','Salmos':'psalms',
  'Proverbios':'proverbs','Eclesiastés':'ecclesiastes','Cantares':'song_of_songs',
  'Isaías':'isaiah','Jeremías':'jeremiah','Lamentaciones':'lamentations',
  'Ezequiel':'ezekiel','Daniel':'daniel','Oseas':'hosea','Joel':'joel','Amós':'amos',
  'Abdías':'obadiah','Jonás':'jonah','Miqueas':'micah','Nahúm':'nahum',
  'Habacuc':'habakkuk','Sofonías':'zephaniah','Hageo':'haggai','Zacarías':'zechariah',
  'Malaquías':'malachi','Mateo':'matthew','Marcos':'mark','Lucas':'luke','Juan':'john',
  'Hechos':'acts','Romanos':'romans','1 Corintios':'1_corinthians',
  '2 Corintios':'2_corinthians','Gálatas':'galatians','Efesios':'ephesians',
  'Filipenses':'philippians','Colosenses':'colossians',
  '1 Tesalonicenses':'1_thessalonians','2 Tesalonicenses':'2_thessalonians',
  '1 Timoteo':'1_timothy','2 Timoteo':'2_timothy','Tito':'titus','Filemón':'philemon',
  'Hebreos':'hebrews','Santiago':'james','1 Pedro':'1_peter','2 Pedro':'2_peter',
  '1 Juan':'1_john','2 Juan':'2_john','3 Juan':'3_john','Judas':'jude',
  'Apocalipsis':'revelation',
};

const HIGHLIGHT_COLORS = [
  { id: 'yellow', light: '#fef08a', dark: '#78350f', label: 'Amarillo' },
  { id: 'green',  light: '#bbf7d0', dark: '#14532d', label: 'Verde'    },
  { id: 'blue',   light: '#bae6fd', dark: '#1e3a5f', label: 'Azul'     },
  { id: 'pink',   light: '#fecdd3', dark: '#881337', label: 'Rosa'     },
  { id: 'orange', light: '#fed7aa', dark: '#7c2d12', label: 'Naranja'  },
  { id: 'purple', light: '#e9d5ff', dark: '#4c1d95', label: 'Morado'   },
  { id: 'red',    light: '#fca5a5', dark: '#7f1d1d', label: 'Rojo'     },
  { id: 'teal',   light: '#99f6e4', dark: '#134e4a', label: 'Turquesa' },
];

function getHighlightBg(colorId, darkMode) {
  if (!colorId) return null;
  // Color personalizado (hex directo)
  if (colorId.startsWith('#')) {
    if (!darkMode) return colorId;
    const r = parseInt(colorId.slice(1, 3), 16);
    const g = parseInt(colorId.slice(3, 5), 16);
    const b = parseInt(colorId.slice(5, 7), 16);
    return `rgb(${Math.round(r * 0.28)},${Math.round(g * 0.28)},${Math.round(b * 0.28)})`;
  }
  const c = HIGHLIGHT_COLORS.find(x => x.id === colorId);
  return c ? (darkMode ? c.dark : c.light) : null;
}

const COMMENT_TYPES = [
  { key: 'historico',      label: 'Historia',       icon: '📜' },
  { key: 'linguistico',    label: 'Lingüístico',    icon: '🗣️' },
  { key: 'paleontologico', label: 'Paleontológico', icon: '🦕' },
  { key: 'arquitectonico', label: 'Arquitectónico', icon: '🏛️' },
  { key: 'cientifico',     label: 'Científico',     icon: '🔬' },
  { key: 'costumbres',     label: 'Costumbres',     icon: '🏺' },
  { key: 'geografico',     label: 'Geografía',      icon: '🗺️' },
  { key: 'tipologia',      label: 'Tipología',      icon: '🔁' },
  { key: 'comentarios',    label: 'Comentarios',    icon: '💬' },
];

// Número de libro 1-66 para la API de bolls.life
const BOLLS_NUM = {
  gn:1,ex:2,lv:3,nm:4,dt:5,js:6,jud:7,rt:8,'1sm':9,'2sm':10,
  '1kgs':11,'2kgs':12,'1ch':13,'2ch':14,ezr:15,ne:16,et:17,job:18,ps:19,
  prv:20,ec:21,so:22,is:23,jr:24,lm:25,ez:26,dn:27,ho:28,jl:29,am:30,
  ob:31,jn:32,mi:33,na:34,hk:35,zp:36,hg:37,zc:38,ml:39,mt:40,
  mk:41,lk:42,jo:43,act:44,rm:45,'1co':46,'2co':47,gl:48,eph:49,ph:50,
  cl:51,'1ts':52,'2ts':53,'1tm':54,'2tm':55,tt:56,phm:57,hb:58,jm:59,
  '1pe':60,'2pe':61,'1jo':62,'2jo':63,'3jo':64,jd:65,re:66,
};

function convertBible(raw) {
  return raw.map(book => ({
    abbrev: book.abbrev,
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
  Object.entries(highlights).forEach(([k, v]) => { if (k.startsWith('hl_')) hl[k.slice(3)] = v; });
  Object.entries(notes).forEach(([k, v]) => { if (k.startsWith('note_')) nt[k.slice(5)] = v; });
  Object.entries(bookmarks).forEach(([k, v]) => { if (k.startsWith('bm_')) bm[k.slice(3)] = v; });
  Object.entries(shared).forEach(([k, v]) => { if (k.startsWith('sh_')) sh[k.slice(3)] = v; });
  return { highlights: hl, notes: nt, bookmarks: bm, shared: sh };
}

// Convierte datos Firestore a estado interno (con prefijos)
function fromFirestore(data) {
  const hl = {}, nt = {}, bm = {}, sh = {};
  Object.entries(data.highlights || {}).forEach(([k, v]) => { hl[`hl_${k}`]   = v; });
  Object.entries(data.notes      || {}).forEach(([k, v]) => { nt[`note_${k}`] = v; });
  Object.entries(data.bookmarks  || {}).forEach(([k, v]) => { bm[`bm_${k}`]   = v; });
  Object.entries(data.shared     || {}).forEach(([k, v]) => { sh[`sh_${k}`]   = v; });
  return {
    hl, nt, bm, sh,
    following:  data.following  || [],
    followers:  data.followers  || [],
    streak:     data.streak     || 0,
    privacy:    data.privacy    || {
      notes: false, highlights: false, bookmarks: false,
      publicProfile: true, followers: true, following: true,
    },
  };
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

function PublicCommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
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

function VerseCard({ verse, bookName, chapter, highlight, note, bookmark, onHighlight, onNote, onBookmark, onShare, onLike, likeCount, user, following, onFollowToggle, darkMode }) {
  const [showActions,    setShowActions]    = useState(false);
  const [showColors,     setShowColors]     = useState(false);
  const [showNote,       setShowNote]       = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [showComments,   setShowComments]   = useState(false);
  const [activeTab,      setActiveTab]      = useState(null);
  const [noteVal,        setNoteVal]        = useState(note || '');
  const [copied,         setCopied]         = useState(false);

  const verseKey   = `${bookName}_${chapter}_${verse.verse}`;
  const commentKey = verseKey;
  const verseData  = COMMENTARY[commentKey];
  const bhBook     = BIBLEHUB_BOOK[bookName];
  const biblehubUrl = bhBook ? `https://biblehub.com/${bhBook}/${chapter}-${verse.verse}.htm` : null;

  // Resuelve la fuente para el tab activo:
  // 1. Si el comentario tiene fuentes por tab → usa esa
  // 2. Si no, fallback a BibleHub (referencia cruzada general)
  function resolveSource(tab) {
    const tabFuente = verseData?.fuentes?.[tab];
    if (tabFuente) {
      if (typeof tabFuente === 'string' && tabFuente.startsWith('http')) {
        return { url: tabFuente, label: '🔗 Ver fuente' };
      }
      if (typeof tabFuente === 'object') return tabFuente;
      // Texto de atribución sin URL
      return { url: null, label: `📖 ${tabFuente}` };
    }
    return biblehubUrl ? { url: biblehubUrl, label: '🔗 Referencias en BibleHub' } : null;
  }

  function toggleActions() {
    const next = !showActions;
    setShowActions(next);
    if (!next) {
      setShowColors(false);
      setShowNote(false);
      setShowCommentary(false);
      setShowComments(false);
    }
  }
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

  const bgColor = getHighlightBg(highlight, darkMode);
  const highlightStyle = bgColor
    ? { backgroundColor: bgColor, borderRadius: '10px', color: darkMode ? '#f5f0eb' : '#1c1917' }
    : {};

  return (
    <div className="verse-card">
      <div className="verse-body" style={highlightStyle}>
        <div className="verse-text-row">
          <span className="verse-num">
            {verse.verse}
            {(hasCommentary || hasRef) && (
              <span className="verse-badges">
                {hasCommentary && <span className="verse-badge badge-commentary" title="Tiene comentario">📖</span>}
                {hasRef        && <span className="verse-badge badge-ref"        title="Tiene referencias">🔗</span>}
              </span>
            )}
          </span>
          <span className="verse-text">{verse.text}</span>
          {(showActions || likeCount > 0) && (
            <button
              className={`heart-btn ${likeCount > 0 ? 'has-likes' : ''}`}
              onClick={e => { e.stopPropagation(); onLike?.(verseKey); }}
              title="Me gusta"
            >
              {likeCount > 0 ? '♥' : '♡'}
              {likeCount > 0 && <span className="heart-count">{likeCount}</span>}
            </button>
          )}
          <button
            className={`expand-btn ${showActions ? 'open' : ''}`}
            onClick={toggleActions}
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

          <button
            className={`icon-btn ${showComments ? 'active' : ''}`}
            onClick={() => { setShowComments(v => !v); setShowColors(false); setShowNote(false); setShowCommentary(false); }}
            title="Comentarios públicos"
          >
            <PublicCommentIcon />
          </button>
        </div>
      )}

      {showColors && (
        <div className="color-picker">
          <span className="color-label">Color:</span>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              className={`color-dot ${highlight === c.id ? 'selected' : ''}`}
              style={{ backgroundColor: darkMode ? c.dark : c.light }}
              title={c.label}
              onClick={() => {
                onHighlight(verse.verse, highlight === c.id ? null : c.id);
                if (highlight === c.id) setShowColors(false);
              }}
            />
          ))}
          <label
            className={`color-dot color-custom-swatch ${highlight?.startsWith('#') ? 'selected' : ''}`}
            style={{ background: highlight?.startsWith('#') ? getHighlightBg(highlight, darkMode) : 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }}
            title="Color personalizado"
          >
            <input
              type="color"
              className="color-custom-input"
              value={highlight?.startsWith('#') ? highlight : '#fbbf24'}
              onChange={e => onHighlight(verse.verse, e.target.value)}
            />
          </label>
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

      {showComments && (
        <CommentsPanel
          verseKey={`${bookName}_${chapter}_${verse.verse}`}
          user={user}
          following={following}
          onFollowToggle={onFollowToggle}
        />
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
              {biblehubUrl && (
                <a href={biblehubUrl} target="_blank" rel="noopener noreferrer" className="commentary-source">
                  🔗 Ver en BibleHub
                </a>
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
                  {(() => {
                    const src = resolveSource(activeTab);
                    if (!src) return null;
                    if (src.url) return (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="commentary-source">
                        {src.label}
                      </a>
                    );
                    return <span className="commentary-source">{src.label}</span>;
                  })()}
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
  const [following,       setFollowing]      = useState([]);
  const [followers,       setFollowers]      = useState([]);
  const [likes,           setLikes]          = useState({});
  const [translation,     setTranslation]    = useState(() => lsGet('bible_translation') || 'rvr');
  const [ntvVerses,       setNtvVerses]      = useState({});
  const [ntvLoading,      setNtvLoading]     = useState(false);
  const [streak,          setStreak]         = useState(0);
  const [privacy,         setPrivacy]        = useState({
    notes: false, highlights: false, bookmarks: false,
    publicProfile: true, followers: true, following: true,
  });
  const [showMenu,        setShowMenu]       = useState(false);
  const [globalSearch,    setGlobalSearch]   = useState('');

  // Aplicar tema
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    lsSet('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Guardar preferencia de traducción
  useEffect(() => { lsSet('bible_translation', translation); }, [translation]);

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

  // Auth state + carga de datos
  useEffect(() => {
    return onAuthChange(async (firebaseUser) => {
      if (firebaseUser && !firebaseUser.isAnonymous) {
        const data = await loadUserData(firebaseUser.uid);
        const { hl, nt, bm, sh, following, followers, streak, privacy } = fromFirestore(data);
        setHighlights(hl); setNotes(nt); setBookmarks(bm); setShared(sh);
        setFollowing(following); setFollowers(followers); setStreak(streak); setPrivacy(privacy);
        // Racha de lectura
        const newStreak = await updateReadingStreak(firebaseUser.uid, streak, data.lastReadDate);
        setStreak(newStreak);
        // Guardar perfil y presencia
        await savePresence(firebaseUser.uid, {
          displayName: firebaseUser.displayName || data.displayName || '',
          email:       firebaseUser.email || '',
          photoURL:    firebaseUser.photoURL || '',
          createdAt:   data.createdAt || firebaseUser.metadata.creationTime || new Date().toISOString(),
        });
      } else if (firebaseUser?.isAnonymous) {
        const hl = {}, nt = {}, bm = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith('hl_'))   hl[k] = lsGet(k);
          if (k?.startsWith('note_')) nt[k] = lsGet(k);
          if (k?.startsWith('bm_'))   bm[k] = lsGet(k);
        }
        setHighlights(hl); setNotes(nt); setBookmarks(bm); setShared({}); setFollowing([]); setFollowers([]);
      } else {
        setHighlights({}); setNotes({}); setBookmarks({}); setShared({}); setFollowing([]); setFollowers([]);
      }
      setUser(firebaseUser);
    });
  }, []);

  // Actualizar presencia cada 2 minutos
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const id = setInterval(() => savePresence(user.uid, {}), 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [user]);

  // Cargar corazones del capítulo actual
  useEffect(() => {
    const chapterData = books.find(b => b.name === selectedBook)
      ?.chapters.find(c => c.chapter === selectedChapter);
    if (!chapterData) return;
    loadChapterLikes(selectedBook, selectedChapter, chapterData.verses).then(setLikes);
  }, [selectedBook, selectedChapter, books]);

  // Cargar NTV desde bolls.life API con caché en localStorage
  useEffect(() => {
    if (translation !== 'ntv') { setNtvVerses({}); return; }
    const currentBook = books.find(b => b.name === selectedBook);
    if (!currentBook) return;
    const bookNum = BOLLS_NUM[currentBook.abbrev];
    if (!bookNum) return;
    const cacheKey = `ntv_${bookNum}_${selectedChapter}`;
    const cached = lsGet(cacheKey);
    if (cached) {
      try { setNtvVerses(JSON.parse(cached)); return; } catch {}
    }
    setNtvLoading(true);
    fetch(`https://bolls.life/get-text/NTV/${bookNum}/${selectedChapter}/`)
      .then(r => r.json())
      .then(data => {
        const map = {};
        data.forEach(v => { map[v.verse] = v.text.replace(/<[^>]*>/g, '').trim(); });
        lsSet(cacheKey, JSON.stringify(map));
        setNtvVerses(map);
        setNtvLoading(false);
      })
      .catch(() => setNtvLoading(false));
  }, [translation, selectedBook, selectedChapter, books]);

  // Sincronizar con Firestore cuando cambia el usuario
  async function syncFirestore(hl, nt, bm, sh, uid) {
    if (!uid) return;
    await saveUserData(uid, toFirestore(hl, nt, bm, sh));
  }

  const isCloud = user && !user.isAnonymous;

  const book         = books.find(b => b.name === selectedBook);
  const chapter      = book?.chapters.find(c => c.chapter === selectedChapter);
  const rawVerses    = chapter?.verses || [];
  const displayVerses = rawVerses
    .map(v => ({
      ...v,
      text: (translation === 'ntv' && ntvVerses[v.verse]) ? ntvVerses[v.verse] : v.text,
    }))
    .filter(v => !searchQuery.trim() || v.text.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalChapters = book?.chapters.length || 1;

  // Búsqueda global — escanea todos los libros cuando se activa
  const globalResults = React.useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (q.length < 3) return [];
    const results = [];
    for (const b of books) {
      for (const ch of b.chapters) {
        for (const v of ch.verses) {
          if (v.text.toLowerCase().includes(q)) {
            results.push({ bookName: b.name, chapter: ch.chapter, verse: v.verse, text: v.text });
            if (results.length >= 60) return results;
          }
        }
      }
    }
    return results;
  }, [globalSearch, books]);

  function changeBook(name) {
    setSelectedBook(name); setSelectedChapter(1); setSearchQuery('');
    lsSet('bible_translation', translation);
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

  const handleFollowToggle = useCallback(async (targetUid) => {
    if (!user || user.isAnonymous) return;
    const isFollowing = following.includes(targetUid);
    if (isFollowing) {
      await unfollowUser(user.uid, targetUid);
      setFollowing(f => f.filter(uid => uid !== targetUid));
    } else {
      await followUser(user.uid, targetUid);
      setFollowing(f => [...f, targetUid]);
    }
  }, [user, following]);

  const handleLike = useCallback(async (verseKey) => {
    if (!user || user.isAnonymous) return;
    setLikes(prev => ({ ...prev, [verseKey]: (prev[verseKey] || 0) + 1 }));
    await incrementLike(verseKey);
  }, [user]);

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
          <select
            className="translation-select"
            value={translation}
            onChange={e => setTranslation(e.target.value)}
            title="Versión bíblica"
          >
            <option value="rvr">RVR 1960</option>
            <option value="ntv">{ntvLoading ? 'NTV (cargando…)' : 'NTV'}</option>
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
          placeholder="Buscar… (Enter = toda la Biblia)"
          value={globalSearch || searchQuery}
          onChange={e => {
            if (globalSearch) setGlobalSearch(e.target.value);
            else setSearchQuery(e.target.value);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const q = e.target.value.trim();
              if (q.length >= 3) { setGlobalSearch(q); setSearchQuery(''); }
            }
            if (e.key === 'Escape') { setGlobalSearch(''); setSearchQuery(''); }
          }}
        />
        {(globalSearch || searchQuery) && (
          <button className="search-clear-btn" onClick={() => { setGlobalSearch(''); setSearchQuery(''); }} title="Limpiar búsqueda">×</button>
        )}
        <button
          className="search-global-btn"
          onClick={() => {
            const q = (globalSearch || searchQuery).trim();
            if (q.length >= 3) { setGlobalSearch(q); setSearchQuery(''); }
          }}
          title="Buscar en toda la Biblia"
        >🔍</button>
      </div>

      {globalSearch && (
        <div className="global-results">
          <div className="global-results-header">
            {globalResults.length === 0
              ? `Sin resultados para "${globalSearch}"`
              : `${globalResults.length === 60 ? '60+' : globalResults.length} resultado${globalResults.length !== 1 ? 's' : ''} para "${globalSearch}"`}
          </div>
          {globalResults.map((r, i) => (
            <button
              key={i}
              className="global-result-item"
              onClick={() => {
                setGlobalSearch('');
                setSearchQuery('');
                changeBook(r.bookName);
                setTimeout(() => changeChapter(r.chapter), 50);
              }}
            >
              <span className="global-result-ref">{r.bookName} {r.chapter}:{r.verse}</span>
              <span className="global-result-text">{r.text}</span>
            </button>
          ))}
        </div>
      )}

      <div className="verses-container">
        <div className="chapter-title">
          <h2>{selectedBook}</h2>
          <p>Capítulo {selectedChapter} — {chapter?.verses.length || 0} versículos</p>
        </div>

        {displayVerses.length === 0 ? (
          <div className="no-results">
            {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Capítulo sin versículos'}
          </div>
        ) : (
          displayVerses.map(verse => {
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
                likeCount={likes[`${selectedBook}_${selectedChapter}_${verse.verse}`] || 0}
                onHighlight={handleHighlight}
                onNote={handleNote}
                onBookmark={handleBookmark}
                onShare={handleShare}
                onLike={handleLike}
                user={user}
                following={following}
                onFollowToggle={handleFollowToggle}
                darkMode={darkMode}
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
          following={following}
          followers={followers}
          streak={streak}
          privacy={privacy}
          onPrivacyChange={setPrivacy}
          darkMode={darkMode}
          onClose={() => setShowMenu(false)}
          onNavigate={(bookName, chapterNum) => {
            changeBook(bookName);
            setTimeout(() => changeChapter(chapterNum), 50);
          }}
          onFollowingChange={setFollowing}
        />
      )}
    </div>
  );
}
