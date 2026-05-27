import React, { useState, useEffect, useRef } from 'react';
import { loadComments, addComment, deleteComment } from './firebase';

function timeAgo(ts) {
  if (!ts) return '';
  const ms   = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
  const diff = Date.now() - ms;
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

function Avatar({ photoURL, displayName, size = 28 }) {
  const initial = (displayName || '?').charAt(0).toUpperCase();
  return photoURL
    ? <img src={photoURL} alt={displayName} className="comment-avatar-img" style={{ width: size, height: size }} />
    : <span className="comment-avatar-initials" style={{ width: size, height: size, fontSize: size * 0.45 }}>{initial}</span>;
}

export default function CommentsPanel({ verseKey, user, following, onFollowToggle }) {
  const [comments, setComments]   = useState([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const textareaRef               = useRef(null);
  const isGuest = !user || user.isAnonymous;
  const ADMIN = 'rodrigo.n.arena@hotmail.com';

  useEffect(() => {
    loadComments(verseKey).then(c => { setComments(c); setLoading(false); });
  }, [verseKey]);

  // Mostrar: propios + de gente que sigo
  const visible = comments.filter(c => c.uid === user?.uid || following.includes(c.uid));

  async function handleSend() {
    if (!text.trim() || isGuest || sending) return;
    setSending(true);
    await addComment(verseKey, user.uid, user.displayName, user.photoURL, text.trim());
    setText('');
    const updated = await loadComments(verseKey);
    setComments(updated);
    setSending(false);
  }

  async function handleDelete(commentId) {
    await deleteComment(verseKey, commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="comments-panel">
      <div className="comments-header">
        💬 Comentarios públicos
        <span className="comments-count">{visible.length}</span>
      </div>

      {loading ? (
        <div className="comments-loading">Cargando…</div>
      ) : visible.length === 0 ? (
        <div className="comments-empty">
          {isGuest
            ? 'Iniciá sesión para ver y escribir comentarios de amigos.'
            : 'Sé el primero en comentar este versículo.'}
        </div>
      ) : (
        <div className="comments-list">
          {visible.map(c => {
            const isMe       = c.uid === user?.uid;
            const isFollowing = following.includes(c.uid);
            return (
              <div key={c.id} className={`comment-item ${isMe ? 'comment-mine' : ''}`}>
                <div className="comment-avatar">
                  <Avatar photoURL={c.photoURL} displayName={c.displayName} />
                </div>
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-author">{c.displayName}</span>
                    <span className="comment-time">{timeAgo(c.timestamp)}</span>
                    {!isMe && (
                      <button
                        className={`comment-follow-btn ${isFollowing ? 'following' : ''}`}
                        onClick={() => onFollowToggle(c.uid)}
                      >
                        {isFollowing ? 'Siguiendo' : '+ Seguir'}
                      </button>
                    )}
                    {(isMe || user?.email === ADMIN) && (
                      <button className="comment-delete-btn" onClick={() => handleDelete(c.id)} title="Eliminar">✕</button>
                    )}
                  </div>
                  <div className="comment-text">{c.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isGuest ? (
        <div className="comments-guest-note">Iniciá sesión para comentar.</div>
      ) : (
        <div className="comment-input-row">
          <div className="comment-input-avatar">
            <Avatar photoURL={user?.photoURL} displayName={user?.displayName} size={26} />
          </div>
          <textarea
            ref={textareaRef}
            className="comment-textarea"
            placeholder="Escribí un comentario público…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button
            className="comment-send-btn"
            onClick={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? '…' : '↑'}
          </button>
        </div>
      )}
    </div>
  );
}
