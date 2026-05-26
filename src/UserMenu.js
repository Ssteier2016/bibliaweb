import React, { useState, useEffect, useRef } from 'react';
import { logout, updateUserDisplayName, getAllUsers } from './firebase';

const ADMIN_EMAIL = 'rodrigo.n.arena@hotmail.com';

const SECTIONS = [
  { key: 'bookmarks',  label: 'Guardados',    icon: '🔖' },
  { key: 'highlights', label: 'Subrayados',   icon: '🖊️' },
  { key: 'notes',      label: 'Notas',        icon: '📝' },
  { key: 'shared',     label: 'Compartidos',  icon: '↗️' },
];

const HIGHLIGHT_COLORS = {
  yellow: '#fef08a', green: '#bbf7d0', blue: '#bae6fd',
  pink: '#fecdd3', orange: '#fed7aa', purple: '#e9d5ff',
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

function timeAgo(ts) {
  if (!ts) return 'nunca';
  const ms   = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
  const diff = Date.now() - ms;
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  const ms = lastSeen.toMillis ? lastSeen.toMillis() : new Date(lastSeen).getTime();
  return Date.now() - ms < 5 * 60 * 1000;
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
          : item.text ? `"${item.text.slice(0, 80)}${item.text.length > 80 ? '…' : ''}"` : ''}
      </div>
    </button>
  );
}

// ── Panel de administración ────────────────────────────────────

function AdminPanel() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers().then(u => { setUsers(u); setLoading(false); });
  }, []);

  const online  = users.filter(u => isOnline(u.lastSeen));
  const offline = users.filter(u => !isOnline(u.lastSeen));

  if (loading) return <div className="menu-empty">Cargando usuarios…</div>;

  return (
    <div className="admin-panel">
      <div className="admin-summary">
        <span className="admin-stat"><span className="online-dot" />En línea: {online.length}</span>
        <span className="admin-stat">Total: {users.length}</span>
      </div>
      {[...online, ...offline].map(u => (
        <div key={u.uid} className="admin-user-row">
          <div className="admin-user-avatar">
            {u.photoURL
              ? <img src={u.photoURL} alt={u.displayName} className="admin-avatar-img" />
              : <span className="admin-avatar-initials">{(u.displayName || u.email || '?').charAt(0).toUpperCase()}</span>
            }
            {isOnline(u.lastSeen) && <span className="admin-online-badge" />}
          </div>
          <div className="admin-user-info">
            <div className="admin-user-name">{u.displayName || '(sin nombre)'}</div>
            <div className="admin-user-email">{u.email || '(invitado)'}</div>
            <div className="admin-user-meta">
              {isOnline(u.lastSeen)
                ? <span className="admin-online-text">En línea</span>
                : <span className="admin-offline-text">Visto {timeAgo(u.lastSeen)}</span>
              }
              {u.createdAt && <span className="admin-created"> · Registrado {new Date(u.createdAt?.seconds ? u.createdAt.seconds * 1000 : u.createdAt).toLocaleDateString('es-AR')}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── UserMenu ───────────────────────────────────────────────────

export default function UserMenu({ user, books, bookmarks, highlights, notes, shared, following, onClose, onNavigate }) {
  const [section,      setSection]      = useState('bookmarks');
  const [shareMsg,     setShareMsg]     = useState('');
  const [editingName,  setEditingName]  = useState(false);
  const [nameVal,      setNameVal]      = useState('');
  const [nameSaving,   setNameSaving]   = useState(false);
  const nameInputRef = useRef(null);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isGuest = !user || user.isAnonymous;

  const allSections = isAdmin
    ? [...SECTIONS, { key: 'admin', label: 'Usuarios', icon: '🛡️' }]
    : SECTIONS;

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus();
  }, [editingName]);

  const displayName  = user?.displayName || (isGuest ? 'Invitado' : user?.email?.split('@')[0] || 'Usuario');
  const displayEmail = isGuest ? 'Modo invitado' : (user?.email || '');
  const photoURL     = user?.photoURL;

  function startEditName() {
    setNameVal(displayName);
    setEditingName(true);
  }

  async function saveName() {
    if (!nameVal.trim() || nameVal === displayName) { setEditingName(false); return; }
    setNameSaving(true);
    await updateUserDisplayName(nameVal.trim());
    setNameSaving(false);
    setEditingName(false);
  }

  function buildList(obj, prefix) {
    return Object.entries(obj).map(([k]) => {
      const raw = k.startsWith(prefix) ? k.slice(prefix.length) : k;
      return { raw, parsed: parseKey(raw, books) };
    }).filter(x => x.parsed);
  }

  const lists = {
    bookmarks:  buildList(bookmarks,  'bm_'),
    highlights: buildList(highlights, 'hl_'),
    notes:      buildList(notes,      'note_'),
    shared:     buildList(shared,     'sh_'),
  };

  const currentList = lists[section] || [];

  function getExtra(sec, raw) {
    if (sec === 'highlights') return { color: highlights[`hl_${raw}`] };
    if (sec === 'notes')      return { note: notes[`note_${raw}`] };
    return {};
  }

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
            {editingName ? (
              <div className="menu-name-edit-row">
                <input
                  ref={nameInputRef}
                  className="menu-name-input"
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  onBlur={saveName}
                  maxLength={40}
                />
                {nameSaving && <span className="menu-name-saving">…</span>}
              </div>
            ) : (
              <div className="menu-user-name">
                {displayName}
                {!isGuest && (
                  <button className="menu-name-edit-btn" onClick={startEditName} title="Editar nombre">✏️</button>
                )}
              </div>
            )}
            <div className="menu-user-email">{displayEmail}</div>
            {isAdmin && <div className="menu-admin-badge">Administrador</div>}
          </div>
        </div>

        {/* Section tabs */}
        <div className="menu-tabs">
          {allSections.map(s => (
            <button
              key={s.key}
              className={`menu-tab ${section === s.key ? 'active' : ''}`}
              onClick={() => setSection(s.key)}
            >
              {s.icon} {s.label}
              {s.key !== 'admin' && (
                <span className="menu-tab-count">{lists[s.key]?.length || 0}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="menu-content">
          {section === 'admin' ? (
            <AdminPanel />
          ) : (
            <>
              {isGuest && (
                <div className="menu-guest-notice">
                  Como invitado, tus datos se guardan solo en este dispositivo.
                </div>
              )}
              {currentList.length === 0 ? (
                <div className="menu-empty">
                  {allSections.find(s => s.key === section)?.icon} Sin {allSections.find(s => s.key === section)?.label.toLowerCase()} aún.
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
            </>
          )}
        </div>

        {/* Bottom actions */}
        <div className="menu-actions">
          <button className="menu-share-web-btn" onClick={handleShare}>
            {shareMsg || '↗ Compartir Bibl.ia'}
          </button>
          <button className="menu-logout-btn" onClick={async () => { await logout(); onClose(); }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
