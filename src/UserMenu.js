import React, { useState, useEffect } from 'react';
import { logout } from './firebase';

const SECTIONS = [
  { key: 'bookmarks', label: 'Guardados',   icon: '🔖' },
  { key: 'highlights', label: 'Subrayados', icon: '🖊️' },
  { key: 'notes',      label: 'Notas',      icon: '📝' },
  { key: 'shared',     label: 'Compartidos',icon: '↗️' },
];

const HIGHLIGHT_COLORS = {
  yellow: '#fef08a', green:  '#bbf7d0', blue:   '#bae6fd',
  pink:   '#fecdd3', orange: '#fed7aa', purple: '#e9d5ff',
};

function parseKey(raw, books) {
  const parts = raw.split('_');
  if (parts.length < 3) return null;
  const verseNum   = parseInt(parts.pop());
  const chapterNum = parseInt(parts.pop());
  const bookName   = parts.join('_');
  if (isNaN(verseNum) || isNaN(chapterNum)) return null;
  const book    = books.find(b => b.name === bookName);
  const chapter = book?.chapters.find(c => c.chapter === chapterNum);
  const verse   = chapter?.verses.find(v => v.verse === verseNum);
  return { bookName, chapterNum, verseNum, text: verse?.text || '' };
}

function VerseItem({ item, extra, onClick }) {
  if (!item) return null;
  return (
    <button className="menu-verse-item" onClick={onClick}>
      <div className="menu-verse-ref">
        {extra?.color && (
          <span className="menu-color-dot" style={{ background: HIGHLIGHT_COLORS[extra.color] || '#fef08a' }} />
        )}
        <strong>{item.bookName} {item.chapterNum}:{item.verseNum}</strong>
      </div>
      <div className="menu-verse-text">
        {extra?.note
          ? <em>"{extra.note}"</em>
          : item.text
            ? `"${item.text.slice(0, 80)}${item.text.length > 80 ? '…' : ''}"`
            : ''}
      </div>
    </button>
  );
}

export default function UserMenu({ user, books, bookmarks, highlights, notes, shared, onClose, onNavigate }) {
  const [section, setSection] = useState('bookmarks');
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isGuest = !user || user.isAnonymous;
  const displayName = user?.displayName || (isGuest ? 'Invitado' : user?.email?.split('@')[0] || 'Usuario');
  const displayEmail = isGuest ? 'Modo invitado' : (user?.email || '');
  const photoURL = user?.photoURL;

  function buildList(obj, prefix) {
    return Object.entries(obj).map(([k]) => {
      const raw = k.startsWith(prefix) ? k.slice(prefix.length) : k;
      return { raw, parsed: parseKey(raw, books) };
    }).filter(x => x.parsed);
  }

  const bookmarkList  = buildList(bookmarks,  'bm_');
  const highlightList = buildList(highlights, 'hl_');
  const noteList      = buildList(notes,      'note_');
  const sharedList    = buildList(shared,     'sh_');

  const lists = { bookmarks: bookmarkList, highlights: highlightList, notes: noteList, shared: sharedList };
  const currentList = lists[section] || [];

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bibl.ia', text: 'Te comparto esta Biblia digital:', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareMsg('¡Enlace copiado!');
        setTimeout(() => setShareMsg(''), 2500);
      }
    } catch {}
  }

  async function handleLogout() {
    await logout();
    onClose();
  }

  function getExtra(section, raw) {
    if (section === 'highlights') return { color: highlights[`hl_${raw}`] };
    if (section === 'notes')      return { note: notes[`note_${raw}`] };
    return {};
  }

  return (
    <>
      <div className="menu-overlay" onClick={onClose} />
      <div className="user-menu">

        {/* Header */}
        <div className="menu-header">
          <span className="menu-header-title">Mi perfil</span>
          <button className="menu-close-btn" onClick={onClose} title="Cerrar">✕</button>
        </div>

        {/* User info */}
        <div className="menu-user-info">
          <div className="menu-avatar">
            {photoURL
              ? <img src={photoURL} alt="avatar" className="menu-avatar-img" />
              : <span className="menu-avatar-initials">
                  {isGuest ? '👤' : displayName.charAt(0).toUpperCase()}
                </span>
            }
          </div>
          <div className="menu-user-text">
            <div className="menu-user-name">{displayName}</div>
            <div className="menu-user-email">{displayEmail}</div>
          </div>
        </div>

        {/* Section tabs */}
        <div className="menu-tabs">
          {SECTIONS.map(s => (
            <button
              key={s.key}
              className={`menu-tab ${section === s.key ? 'active' : ''}`}
              onClick={() => setSection(s.key)}
            >
              {s.icon} {s.label}
              <span className="menu-tab-count">
                {lists[s.key]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="menu-content">
          {isGuest && (
            <div className="menu-guest-notice">
              Como invitado, tus datos se guardan solo en este dispositivo.
            </div>
          )}
          {currentList.length === 0 ? (
            <div className="menu-empty">
              {SECTIONS.find(s => s.key === section)?.icon} Sin {SECTIONS.find(s => s.key === section)?.label.toLowerCase()} aún.
            </div>
          ) : (
            currentList.map(({ raw, parsed }) => (
              <VerseItem
                key={raw}
                item={parsed}
                extra={getExtra(section, raw)}
                onClick={() => { onNavigate(parsed.bookName, parsed.chapterNum); onClose(); }}
              />
            ))
          )}
        </div>

        {/* Bottom actions */}
        <div className="menu-actions">
          <button className="menu-share-web-btn" onClick={handleShare}>
            {shareMsg || '↗ Compartir Bibl.ia'}
          </button>
          <button className="menu-logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
