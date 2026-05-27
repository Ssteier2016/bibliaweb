import React, { useState, useEffect, useRef } from 'react';
import {
  logout, updateUserDisplayName, getAllUsers, getUserProfile,
  uploadProfilePhoto, updatePrivacy, followUser, unfollowUser,
} from './firebase';
import ChatPanel from './ChatPanel';

const ADMIN_EMAIL = 'rodrigo.n.arena@hotmail.com';

const SECTIONS = [
  { key: 'bookmarks',  label: 'Guardados',   icon: '🔖' },
  { key: 'highlights', label: 'Subrayados',  icon: '🖊️' },
  { key: 'notes',      label: 'Notas',       icon: '📝' },
  { key: 'shared',     label: 'Compartidos', icon: '↗️' },
  { key: 'amigos',     label: 'Amigos',      icon: '👥' },
  { key: 'mensajes',   label: 'Mensajes',    icon: '💬' },
  { key: 'config',     label: 'Config',      icon: '⚙️' },
];

const HIGHLIGHT_MAP = {
  yellow:'#fef08a', green:'#bbf7d0', blue:'#bae6fd',
  pink:'#fecdd3', orange:'#fed7aa', purple:'#e9d5ff',
  red:'#fca5a5', teal:'#99f6e4',
};

function getSwatchBg(colorId) {
  if (!colorId) return 'transparent';
  if (colorId.startsWith('#')) return colorId;
  return HIGHLIGHT_MAP[colorId] || 'transparent';
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

// ── Toggle switch ──────────────────────────────────────────────

function Toggle({ on, onChange }) {
  return (
    <button className={`toggle-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="toggle-thumb" />
    </button>
  );
}

// ── Avatar ─────────────────────────────────────────────────────

function Avatar({ photoURL, displayName, size = 36 }) {
  const initial = (displayName || '?').charAt(0).toUpperCase();
  return photoURL
    ? <img src={photoURL} alt={displayName} className="menu-avatar-img" style={{ width: size, height: size }} />
    : <span className="menu-avatar-initials" style={{ width: size, height: size, fontSize: size * 0.42 }}>{initial}</span>;
}

// ── Vista de perfil de otro usuario ───────────────────────────

function ProfileView({ targetUid, myUid, books, following, onFollowToggle, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile(targetUid).then(p => { setProfile(p); setLoading(false); });
  }, [targetUid]);

  if (loading) return <div className="menu-empty">Cargando perfil…</div>;
  if (!profile) return <div className="menu-empty">Perfil no encontrado.</div>;

  const isMe        = targetUid === myUid;
  const isFollowing = following.includes(targetUid);
  const privacy     = profile.privacy || {};
  const canView     = isMe || privacy.publicProfile !== false || isFollowing;

  const showFollowers = isMe || privacy.followers !== false || isFollowing;
  const showFollowing = isMe || privacy.following !== false || isFollowing;

  const bkList = canView && privacy.bookmarks
    ? Object.keys(profile.bookmarks || {}).map(k => parseKey(k, books)).filter(Boolean)
    : [];
  const hlList = canView && privacy.highlights
    ? Object.entries(profile.highlights || {}).map(([k, v]) => ({ item: parseKey(k, books), color: v })).filter(x => x.item)
    : [];
  const ntList = canView && privacy.notes
    ? Object.entries(profile.notes || {}).map(([k, v]) => ({ item: parseKey(k, books), note: v })).filter(x => x.item)
    : [];

  return (
    <div className="profile-view">
      <button className="profile-back-btn" onClick={onBack}>← Volver</button>

      <div className="profile-header">
        <div className="profile-avatar-wrap">
          <Avatar photoURL={profile.photoURL} displayName={profile.displayName} size={64} />
          {isOnline(profile.lastSeen) && <span className="admin-online-badge" />}
        </div>
        <div className="profile-info">
          <div className="profile-name">{profile.displayName || '(sin nombre)'}</div>
          {privacy.publicProfile !== false && (
            <div className="profile-email">{profile.email}</div>
          )}
          <div className="profile-streak">🔥 {profile.streak || 0} días seguidos</div>
        </div>
      </div>

      {!isMe && (
        <button
          className={`profile-follow-btn ${isFollowing ? 'following' : ''}`}
          onClick={() => onFollowToggle(targetUid)}
        >
          {isFollowing ? '✓ Siguiendo' : '+ Seguir'}
        </button>
      )}

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-num">{Object.keys(profile.bookmarks || {}).length}</span>
          <span className="profile-stat-label">guardados</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-num">{Object.keys(profile.highlights || {}).length}</span>
          <span className="profile-stat-label">subrayados</span>
        </div>
        {showFollowing && (
          <div className="profile-stat">
            <span className="profile-stat-num">{(profile.following || []).length}</span>
            <span className="profile-stat-label">siguiendo</span>
          </div>
        )}
        {showFollowers && (
          <div className="profile-stat">
            <span className="profile-stat-num">{(profile.followers || []).length}</span>
            <span className="profile-stat-label">seguidores</span>
          </div>
        )}
      </div>

      {!canView ? (
        <div className="profile-private">🔒 Este perfil es privado.</div>
      ) : (
        <div className="profile-data">
          {bkList.length > 0 && (
            <div className="profile-section">
              <div className="profile-section-title">🔖 Guardados</div>
              {bkList.slice(0, 5).map((item, i) => (
                <div key={i} className="profile-verse-row">
                  <strong>{item.bookName} {item.chapterNum}:{item.verseNum}</strong>
                  <span className="profile-verse-text">"{item.text.slice(0, 60)}…"</span>
                </div>
              ))}
            </div>
          )}
          {hlList.length > 0 && (
            <div className="profile-section">
              <div className="profile-section-title">🖊️ Subrayados</div>
              {hlList.slice(0, 5).map(({ item, color }, i) => (
                <div key={i} className="profile-verse-row">
                  <span className="menu-color-dot" style={{ background: getSwatchBg(color) }} />
                  <strong>{item.bookName} {item.chapterNum}:{item.verseNum}</strong>
                </div>
              ))}
            </div>
          )}
          {ntList.length > 0 && (
            <div className="profile-section">
              <div className="profile-section-title">📝 Notas</div>
              {ntList.slice(0, 3).map(({ item, note }, i) => (
                <div key={i} className="profile-verse-row">
                  <strong>{item.bookName} {item.chapterNum}:{item.verseNum}</strong>
                  <em className="profile-verse-text">"{note.slice(0, 60)}{note.length > 60 ? '…' : ''}"</em>
                </div>
              ))}
            </div>
          )}
          {bkList.length === 0 && hlList.length === 0 && ntList.length === 0 && (
            <div className="menu-empty">Este usuario no comparte datos públicamente.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Panel de administración ────────────────────────────────────

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers().then(u => { setUsers(u); setLoading(false); });
  }, []);

  if (loading) return <div className="menu-empty">Cargando usuarios…</div>;

  const online  = users.filter(u => isOnline(u.lastSeen));
  const offline = users.filter(u => !isOnline(u.lastSeen));

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
              ? <img src={u.photoURL} alt="" className="admin-avatar-img" />
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
              {u.streak > 0 && <span className="admin-created"> · 🔥 {u.streak} días</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Mini fila para un usuario que seguís
function FollowingRow({ uid, onView, onToggle, isMutual, onChat }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => { getUserProfile(uid).then(setProfile); }, [uid]);
  if (!profile) return <div className="amigo-row"><div className="menu-empty">…</div></div>;
  return (
    <div className="amigo-row">
      <button className="amigo-avatar" onClick={onView}>
        <Avatar photoURL={profile.photoURL} displayName={profile.displayName} size={36} />
      </button>
      <div className="amigo-info" onClick={onView}>
        <div className="amigo-name">{profile.displayName || '(sin nombre)'}</div>
        <div className="amigo-sub-row">
          {isOnline(profile.lastSeen) && <span className="amigo-online">● En línea</span>}
          {isMutual && <span className="amigo-mutual">Amigos</span>}
        </div>
      </div>
      {isMutual && (
        <button className="amigo-chat-btn" onClick={onChat} title="Chatear">💬</button>
      )}
      <button className="amigo-follow-btn following" onClick={onToggle}>Siguiendo</button>
    </div>
  );
}

// Mini fila para un amigo mutuo en la sección Mensajes
function MutualRow({ uid, myFollowers, onChat, onView }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => { getUserProfile(uid).then(setProfile); }, [uid]);
  if (!profile) return null;
  return (
    <div className="amigo-row" onClick={onChat} style={{ cursor: 'pointer' }}>
      <div className="amigo-avatar">
        <Avatar photoURL={profile.photoURL} displayName={profile.displayName} size={36} />
      </div>
      <div className="amigo-info">
        <div className="amigo-name">{profile.displayName || '(sin nombre)'}</div>
        {isOnline(profile.lastSeen) && <span className="amigo-online">● En línea</span>}
      </div>
      <button className="amigo-chat-btn" onClick={e => { e.stopPropagation(); onChat(profile); }} title="Chatear">💬</button>
    </div>
  );
}

// ── UserMenu principal ─────────────────────────────────────────

export default function UserMenu({
  user, books, bookmarks, highlights, notes, shared,
  following, followers, streak, privacy, darkMode,
  onClose, onNavigate, onFollowingChange, onPrivacyChange,
}) {
  const [section,       setSection]       = useState('bookmarks');
  const [shareMsg,      setShareMsg]      = useState('');
  const touchStartX = useRef(null);
  const [editingName,   setEditingName]   = useState(false);
  const [nameVal,       setNameVal]       = useState('');
  const [nameSaving,    setNameSaving]    = useState(false);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [viewingUid,    setViewingUid]    = useState(null);
  const [chatWith,      setChatWith]      = useState(null); // { uid, displayName, photoURL }
  const nameInputRef  = useRef(null);
  const photoInputRef = useRef(null);
  const [photoLoading, setPhotoLoading]  = useState(false);
  const [privacyLocal, setPrivacyLocal]  = useState(privacy);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isGuest = !user || user.isAnonymous;

  // Amigos mutuos: yo los sigo Y ellos me siguen
  const mutuals = following.filter(uid => (followers || []).includes(uid));

  const allSections = [
    ...SECTIONS,
    ...(isAdmin ? [{ key: 'admin', label: 'Admin', icon: '🛡️' }] : []),
  ];

  const sectionKeys = allSections.map(s => s.key);
  const currentIdx  = sectionKeys.indexOf(section);

  function goPrev() { if (currentIdx > 0) setSection(sectionKeys[currentIdx - 1]); }
  function goNext() { if (currentIdx < sectionKeys.length - 1) setSection(sectionKeys[currentIdx + 1]); }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (chatWith)   { setChatWith(null); return; }
        if (viewingUid) { setViewingUid(null); return; }
        onClose();
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && currentIdx < sectionKeys.length - 1) setSection(sectionKeys[currentIdx + 1]);
      if (e.key === 'ArrowLeft'  && currentIdx > 0)                       setSection(sectionKeys[currentIdx - 1]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, viewingUid, chatWith, currentIdx]);

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus();
  }, [editingName]);

  useEffect(() => { setPrivacyLocal(privacy); }, [privacy]);

  const displayName  = user?.displayName || (isGuest ? 'Invitado' : user?.email?.split('@')[0] || 'Usuario');
  const displayEmail = isGuest ? 'Modo invitado' : (user?.email || '');

  async function saveName() {
    if (!nameVal.trim() || nameVal === displayName) { setEditingName(false); return; }
    setNameSaving(true);
    await updateUserDisplayName(nameVal.trim());
    setNameSaving(false);
    setEditingName(false);
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoLoading(true);
    const url = await uploadProfilePhoto(user.uid, file);
    if (!url) alert('Error al subir la foto. Verificá las reglas de Firebase Storage.');
    setPhotoLoading(false);
  }

  async function handleSearch(term) {
    setSearchTerm(term);
    if (!term.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const all = await getAllUsers();
    const t   = term.toLowerCase();
    setSearchResults(
      all.filter(u =>
        u.uid !== user?.uid &&
        (u.displayName?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t))
      ).slice(0, 10)
    );
    setSearching(false);
  }

  async function handleFollowToggle(targetUid) {
    if (!user || user.isAnonymous) return;
    const isF = following.includes(targetUid);
    if (isF) {
      await unfollowUser(user.uid, targetUid);
      onFollowingChange(f => f.filter(uid => uid !== targetUid));
    } else {
      await followUser(user.uid, targetUid);
      onFollowingChange(f => [...f, targetUid]);
    }
  }

  async function handlePrivacyToggle(key) {
    const newP = { ...privacyLocal, [key]: !privacyLocal[key] };
    setPrivacyLocal(newP);
    await updatePrivacy(user.uid, newP);
    onPrivacyChange(newP);
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

  async function handleShareWeb() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'Bibl.ia', url });
      else { await navigator.clipboard.writeText(url); setShareMsg('¡Enlace copiado!'); setTimeout(() => setShareMsg(''), 2500); }
    } catch {}
  }

  // ── Sub-vista: chat ────────────────────────────────────────
  if (chatWith) {
    return (
      <>
        <div className="menu-overlay" onClick={() => setChatWith(null)} />
        <div className="user-menu">
          <ChatPanel
            myUser={user}
            otherUser={chatWith}
            onBack={() => setChatWith(null)}
          />
        </div>
      </>
    );
  }

  // ── Sub-vista: perfil de otro usuario ──────────────────────
  if (viewingUid) {
    return (
      <>
        <div className="menu-overlay" onClick={() => setViewingUid(null)} />
        <div className="user-menu">
          <ProfileView
            targetUid={viewingUid}
            myUid={user?.uid}
            books={books}
            following={following}
            onFollowToggle={handleFollowToggle}
            onBack={() => setViewingUid(null)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="menu-overlay" onClick={onClose} />
      <div className="user-menu">

        {/* Header */}
        <div className="menu-header">
          <span className="menu-header-title">Mi perfil</span>
          <button className="menu-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* User info + foto */}
        <div className="menu-user-info">
          <div className="menu-avatar-wrapper">
            <div className="menu-avatar">
              {photoLoading
                ? <span className="menu-avatar-initials">…</span>
                : <Avatar photoURL={user?.photoURL} displayName={displayName} size={52} />
              }
            </div>
            {!isGuest && (
              <button className="avatar-camera-btn" onClick={() => photoInputRef.current?.click()} title="Cambiar foto">📷</button>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" className="photo-file-input" onChange={handlePhotoChange} />
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
                  <button className="menu-name-edit-btn" onClick={() => { setNameVal(displayName); setEditingName(true); }}>✏️</button>
                )}
              </div>
            )}
            <div className="menu-user-email">{displayEmail}</div>
            {!isGuest && (
              <div className="menu-social-counts">
                <span>{following.length} siguiendo</span>
                <span className="menu-social-sep">·</span>
                <span>{(followers || []).length} seguidores</span>
              </div>
            )}
            {streak > 0 && <div className="menu-streak">🔥 {streak} día{streak !== 1 ? 's' : ''} seguido{streak !== 1 ? 's' : ''}</div>}
            {isAdmin && <div className="menu-admin-badge">Administrador</div>}
          </div>
        </div>

        {/* Tabs + flechitas */}
        <div className="menu-tabs-wrapper">
          <button className="tabs-arrow" onClick={goPrev} disabled={currentIdx === 0}>‹</button>
          <div className="menu-tabs">
            {allSections.map(s => (
              <button
                key={s.key}
                className={`menu-tab ${section === s.key ? 'active' : ''}`}
                onClick={() => setSection(s.key)}
              >
                {s.icon} {s.label}
                {s.key === 'mensajes' && mutuals.length > 0 && (
                  <span className="menu-tab-count">{mutuals.length}</span>
                )}
                {lists[s.key] !== undefined && lists[s.key].length > 0 && (
                  <span className="menu-tab-count">{lists[s.key].length}</span>
                )}
              </button>
            ))}
          </div>
          <button className="tabs-arrow" onClick={goNext} disabled={currentIdx === sectionKeys.length - 1}>›</button>
        </div>

        {/* Content — swipeable */}
        <div className="menu-content"
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return;
            const delta = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(delta) > 55) { delta < 0 ? goNext() : goPrev(); }
            touchStartX.current = null;
          }}
        >

          {/* Datos bíblicos */}
          {['bookmarks','highlights','notes','shared'].includes(section) && (
            <>
              {isGuest && <div className="menu-guest-notice">Tus datos se guardan solo en este dispositivo.</div>}
              {(lists[section] || []).length === 0
                ? <div className="menu-empty">{allSections.find(s => s.key === section)?.icon} Sin {allSections.find(s => s.key === section)?.label.toLowerCase()} aún.</div>
                : (lists[section] || []).map(({ raw, parsed }) => (
                    <button key={raw} className="menu-verse-item" onClick={() => { onNavigate(parsed.bookName, parsed.chapterNum); onClose(); }}>
                      <div className="menu-verse-ref">
                        {section === 'highlights' && highlights[`hl_${raw}`] && (
                          <span className="menu-color-dot" style={{ background: getSwatchBg(highlights[`hl_${raw}`]) }} />
                        )}
                        <strong>{parsed.bookName} {parsed.chapterNum}:{parsed.verseNum}</strong>
                      </div>
                      <div className="menu-verse-text">
                        {section === 'notes'
                          ? <em>"{notes[`note_${raw}`]}"</em>
                          : parsed.text ? `"${parsed.text.slice(0,80)}${parsed.text.length > 80 ? '…' : ''}"` : ''
                        }
                      </div>
                    </button>
                  ))
              }
            </>
          )}

          {/* Amigos */}
          {section === 'amigos' && (
            <div className="amigos-panel">
              <div className="amigos-search-row">
                <input
                  className="amigos-search-input"
                  placeholder="Buscar por nombre o email…"
                  value={searchTerm}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>

              {searchTerm ? (
                searching
                  ? <div className="menu-empty">Buscando…</div>
                  : searchResults.length === 0
                    ? <div className="menu-empty">Sin resultados.</div>
                    : searchResults.map(u => (
                        <div key={u.uid} className="amigo-row">
                          <button className="amigo-avatar" onClick={() => setViewingUid(u.uid)}>
                            <Avatar photoURL={u.photoURL} displayName={u.displayName} size={36} />
                          </button>
                          <div className="amigo-info" onClick={() => setViewingUid(u.uid)}>
                            <div className="amigo-name">{u.displayName || '(sin nombre)'}</div>
                            <div className="amigo-email">{u.privacy?.publicProfile !== false ? u.email : ''}</div>
                          </div>
                          {mutuals.includes(u.uid) && (
                            <button className="amigo-chat-btn" onClick={() => setChatWith({ uid: u.uid, displayName: u.displayName, photoURL: u.photoURL })} title="Chatear">💬</button>
                          )}
                          <button
                            className={`amigo-follow-btn ${following.includes(u.uid) ? 'following' : ''}`}
                            onClick={() => handleFollowToggle(u.uid)}
                          >
                            {following.includes(u.uid) ? 'Siguiendo' : '+ Seguir'}
                          </button>
                        </div>
                      ))
              ) : (
                <>
                  <div className="amigos-section-title">Siguiendo ({following.length})</div>
                  {following.length === 0
                    ? <div className="menu-empty">No seguís a nadie todavía. Buscá usuarios arriba.</div>
                    : following.map(uid => (
                        <FollowingRow
                          key={uid}
                          uid={uid}
                          isMutual={mutuals.includes(uid)}
                          onView={() => setViewingUid(uid)}
                          onToggle={() => handleFollowToggle(uid)}
                          onChat={async () => {
                            const p = await getUserProfile(uid);
                            if (p) setChatWith({ uid, displayName: p.displayName, photoURL: p.photoURL });
                          }}
                        />
                      ))
                  }
                </>
              )}
            </div>
          )}

          {/* Mensajes */}
          {section === 'mensajes' && (
            <div className="amigos-panel">
              {isGuest ? (
                <div className="menu-empty">Iniciá sesión para chatear.</div>
              ) : mutuals.length === 0 ? (
                <div className="menu-empty">
                  Cuando vos y otro usuario se sigan mutuamente, podrán chatear aquí. 💬
                </div>
              ) : (
                <>
                  <div className="amigos-section-title">Amigos mutuos ({mutuals.length})</div>
                  {mutuals.map(uid => (
                    <MutualRow
                      key={uid}
                      uid={uid}
                      myFollowers={followers}
                      onView={() => setViewingUid(uid)}
                      onChat={async (profile) => {
                        if (profile) {
                          setChatWith({ uid, displayName: profile.displayName, photoURL: profile.photoURL });
                        } else {
                          const p = await getUserProfile(uid);
                          if (p) setChatWith({ uid, displayName: p.displayName, photoURL: p.photoURL });
                        }
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Configuración */}
          {section === 'config' && (
            <div className="config-panel">
              <div className="config-title">Privacidad</div>
              {[
                { key: 'publicProfile', label: 'Perfil público',          desc: 'Cualquiera puede ver tu perfil' },
                { key: 'followers',     label: 'Mostrar seguidores',       desc: 'Otros ven cuántos te siguen' },
                { key: 'following',     label: 'Mostrar a quién seguís',   desc: 'Otros ven cuántos seguís' },
                { key: 'bookmarks',     label: 'Compartir guardados',      desc: 'Seguidores ven tus versículos guardados' },
                { key: 'highlights',    label: 'Compartir subrayados',     desc: 'Seguidores ven tus subrayados' },
                { key: 'notes',         label: 'Compartir notas',          desc: 'Seguidores ven tus notas' },
              ].map(item => (
                <div key={item.key} className="config-row">
                  <div className="config-row-text">
                    <div className="config-row-label">{item.label}</div>
                    <div className="config-row-desc">{item.desc}</div>
                  </div>
                  <Toggle on={!!privacyLocal[item.key]} onChange={() => handlePrivacyToggle(item.key)} />
                </div>
              ))}
            </div>
          )}

          {/* Admin */}
          {section === 'admin' && <AdminPanel />}

        </div>

        {/* Bottom */}
        <div className="menu-actions">
          <button className="menu-share-web-btn" onClick={handleShareWeb}>
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
