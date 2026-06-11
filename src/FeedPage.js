import React, { useState, useEffect } from 'react';
import {
  subscribeToPosts, createPost,
  togglePostLike, togglePostDislike,
  repostPost, addPostComment, subscribeToPostComments, deletePost,
  uploadPostImage,
} from './firebase';

// ── Comentarios de un post ────────────────────────────────────────────────────

function PostComments({ postId, user }) {
  const [comments, setComments] = useState([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);

  useEffect(() => {
    return subscribeToPostComments(postId, setComments);
  }, [postId]);

  async function send() {
    const text = input.trim();
    if (!text || !user || user.isAnonymous || sending) return;
    setSending(true);
    await addPostComment(postId, user.uid, user.displayName, user.photoURL, text);
    setInput('');
    setSending(false);
  }

  return (
    <div className="post-comments">
      {comments.length === 0 && (
        <p className="post-comments-empty">Sin comentarios aún.</p>
      )}
      {comments.map(c => (
        <div key={c.id} className="post-comment">
          <span className="post-comment-author">{c.displayName}</span>
          <span className="post-comment-text">{c.text}</span>
        </div>
      ))}
      {user && !user.isAnonymous && (
        <div className="post-comment-input-row">
          <input
            className="post-comment-input"
            placeholder="Escribí un comentario…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            disabled={sending}
          />
          <button className="post-comment-send" onClick={send} disabled={!input.trim() || sending}>
            ➤
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de post ───────────────────────────────────────────────────────────

function PostCard({ post, user, onSaveNote }) {
  const [showComments, setShowComments] = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [reposted,     setReposted]     = useState(false);

  const uid      = user?.uid;
  const liked    = !!(uid && post.likes?.includes(uid));
  const disliked = !!(uid && post.dislikes?.includes(uid));
  const isOwner  = !!(uid && post.uid === uid);
  const isGuest  = !user || user.isAnonymous;

  const author      = post.repostOf ? post.repostOf.displayName : post.displayName;
  const authorPhoto = post.repostOf ? post.repostOf.photoURL : post.photoURL;

  const timeStr = post.timestamp?.toDate
    ? post.timestamp.toDate().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
    : '';

  async function handleLike() {
    if (isGuest) return;
    await togglePostLike(post.id, uid, liked, disliked);
  }

  async function handleDislike() {
    if (isGuest) return;
    await togglePostDislike(post.id, uid, liked, disliked);
  }

  async function handleRepost() {
    if (isGuest || reposted || isOwner) return;
    setReposted(true);
    await repostPost(post.id, uid, user.displayName, user.photoURL, post);
  }

  function handleSave() {
    if (isGuest) return;
    const { book, chapter, verse, text: verseText } = post.verseRef;
    const noteText = `[Feed — ${post.displayName}] ${post.text}\n"${verseText}" — ${book} ${chapter}:${verse}`;
    onSaveNote(book, chapter, verse, noteText);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleDelete() {
    await deletePost(post.id, uid);
  }

  return (
    <div className={`post-card${post.repostOf ? ' post-card-repost' : ''}`}>
      {post.repostOf && (
        <div className="post-repost-label">🔁 Republicado por {post.displayName}</div>
      )}

      <div className="post-card-header">
        <div className="post-avatar">
          {authorPhoto
            ? <img src={authorPhoto} alt="" className="post-avatar-img" />
            : <span className="post-avatar-initials">{(author?.[0] || '?').toUpperCase()}</span>
          }
        </div>
        <div className="post-meta">
          <span className="post-author">{author}</span>
          {timeStr && <span className="post-time">{timeStr}</span>}
        </div>
        {isOwner && (
          <button className="post-delete-btn" onClick={handleDelete} title="Eliminar publicación">✕</button>
        )}
      </div>

      {/* Versículo anclado */}
      <div className="post-verse-anchor">
        <span className="post-verse-ref">
          📖 {post.verseRef.book} {post.verseRef.chapter}:{post.verseRef.verse}
        </span>
        <p className="post-verse-text">"{post.verseRef.text}"</p>
      </div>

      {/* Texto del post */}
      {post.text && <p className="post-text">{post.text}</p>}

      {/* Imagen adjunta */}
      {post.imageUrl && (
        <div className="post-image-container">
          <img src={post.imageUrl} alt="Publicación" className="post-image" />
        </div>
      )}

      {/* Acciones */}
      <div className="post-actions">
        <button
          className={`post-action-btn${liked ? ' post-action-active-like' : ''}`}
          onClick={handleLike}
          disabled={isGuest}
          title="Me gusta"
        >
          👍 <span>{post.likes?.length || 0}</span>
        </button>

        <button
          className={`post-action-btn${disliked ? ' post-action-active-dislike' : ''}`}
          onClick={handleDislike}
          disabled={isGuest}
          title="No me gusta"
        >
          👎 <span>{post.dislikes?.length || 0}</span>
        </button>

        <button
          className={`post-action-btn${showComments ? ' post-action-active-like' : ''}`}
          onClick={() => setShowComments(v => !v)}
          title="Comentarios"
        >
          💬 <span>{showComments ? 'Ocultar' : 'Comentar'}</span>
        </button>

        <button
          className={`post-action-btn${reposted ? ' post-action-active-like' : ''}`}
          onClick={handleRepost}
          disabled={isGuest || isOwner || reposted}
          title="Republicar"
        >
          🔁 <span>{post.reposts || 0}</span>
        </button>

        <button
          className={`post-action-btn${saved ? ' post-action-active-like' : ''}`}
          onClick={handleSave}
          disabled={isGuest}
          title="Guardar como nota"
        >
          {saved ? '✓' : '📝'}
        </button>
      </div>

      {showComments && <PostComments postId={post.id} user={user} />}
    </div>
  );
}

// ── Modal nueva publicación ───────────────────────────────────────────────────

function NewPostModal({ user, books, onClose, onSubmit }) {
  const [text,           setText]           = useState('');
  const [selBook,        setSelBook]        = useState(books[0]?.name || '');
  const [selChapter,     setSelChapter]     = useState(1);
  const [selVerse,       setSelVerse]       = useState(1);
  const [submitting,     setSubmitting]     = useState(false);
  const [imageType,      setImageType]      = useState('file'); // 'file' o 'url'
  const [imageFile,      setImageFile]      = useState(null);
  const [imagePreview,   setImagePreview]   = useState('');
  const [imageUrlInput,  setImageUrlInput]  = useState('');

  const bookData    = books.find(b => b.name === selBook);
  const chapterData = bookData?.chapters.find(c => c.chapter === selChapter);
  const verseData   = chapterData?.verses.find(v => v.verse === selVerse);

  function onBookChange(name) { setSelBook(name); setSelChapter(1); setSelVerse(1); }
  function onChapterChange(n) { setSelChapter(Number(n)); setSelVerse(1); }

  const canPost = text.trim() && verseData;

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  }

  function removeImageFile() {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview('');
    }
  }

  async function submit() {
    if (!canPost || submitting) return;
    setSubmitting(true);
    let imageUrl = null;
    if (imageType === 'file' && imageFile) {
      imageUrl = await uploadPostImage(user.uid, imageFile);
    } else if (imageType === 'url' && imageUrlInput.trim()) {
      imageUrl = imageUrlInput.trim();
    }
    await onSubmit(text.trim(), {
      book:    selBook,
      chapter: selChapter,
      verse:   selVerse,
      text:    verseData.text,
    }, imageUrl);
    onClose();
  }

  return (
    <div className="new-post-overlay" onClick={onClose}>
      <div className="new-post-modal" onClick={e => e.stopPropagation()}>
        <div className="new-post-header">
          <span className="new-post-title">Nueva publicación</span>
          <button className="new-post-close" onClick={onClose}>✕</button>
        </div>

        <div className="new-post-verse-label">📖 Versículo anclado <span className="new-post-required">(obligatorio)</span></div>
        <div className="new-post-verse-picker">
          <select value={selBook} onChange={e => onBookChange(e.target.value)}>
            {books.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
          <select value={selChapter} onChange={e => onChapterChange(e.target.value)}>
            {bookData?.chapters.map(c => (
              <option key={c.chapter} value={c.chapter}>Cap. {c.chapter}</option>
            ))}
          </select>
          <select value={selVerse} onChange={e => setSelVerse(Number(e.target.value))}>
            {chapterData?.verses.map(v => (
              <option key={v.verse} value={v.verse}>v. {v.verse}</option>
            ))}
          </select>
        </div>

        {verseData && (
          <div className="new-post-verse-preview">
            <span className="new-post-verse-ref">{selBook} {selChapter}:{selVerse}</span>
            <p>"{verseData.text}"</p>
          </div>
        )}

        <textarea
          className="new-post-textarea"
          placeholder="¿Qué reflexión tenés sobre este versículo?"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          autoFocus
        />

        {/* Adjuntar imagen (Archivo o URL) */}
        <div className="new-post-image-section">
          <div className="new-post-image-label">🖼️ Adjuntar imagen (opcional)</div>
          <div className="new-post-image-tabs">
            <button
              type="button"
              className={`new-post-image-tab ${imageType === 'file' ? 'active' : ''}`}
              onClick={() => setImageType('file')}
            >
              📷 Subir archivo
            </button>
            <button
              type="button"
              className={`new-post-image-tab ${imageType === 'url' ? 'active' : ''}`}
              onClick={() => setImageType('url')}
            >
              🔗 Pegar enlace
            </button>
          </div>

          {imageType === 'file' ? (
            <div className="new-post-image-file-upload">
              {!imagePreview ? (
                <label className="new-post-image-upload-label">
                  📂 Seleccionar archivo de imagen...
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              ) : (
                <div className="new-post-image-preview-container">
                  <img src={imagePreview} alt="Preview" className="new-post-image-preview" />
                  <button type="button" className="new-post-image-remove" onClick={removeImageFile} title="Eliminar imagen">
                    ✕
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="new-post-image-url-input">
              <input
                type="text"
                className="new-post-url-input"
                placeholder="Pegar URL de la imagen (http://...)"
                value={imageUrlInput}
                onChange={e => setImageUrlInput(e.target.value)}
              />
              {imageUrlInput.trim() && (
                <div className="new-post-image-preview-container">
                  <img
                    src={imageUrlInput.trim()}
                    alt="Preview URL"
                    className="new-post-image-preview"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      e.target.style.display = 'block';
                    }}
                  />
                  <button type="button" className="new-post-image-remove" onClick={() => setImageUrlInput('')} title="Limpiar enlace">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="new-post-submit"
          onClick={submit}
          disabled={!canPost || submitting}
        >
          {submitting ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}

// ── FeedPage ─────────────────────────────────────────────────────────────────

export default function FeedPage({ user, books, onSaveNote, onClose, darkMode }) {
  const [posts,       setPosts]       = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPosts(data => {
      setPosts(data);
      setFeedLoading(false);
    });
    return unsub;
  }, []);

  async function handleSubmit(text, verseRef, imageUrl) {
    if (!user || user.isAnonymous) return;
    await createPost(user.uid, user.displayName, user.photoURL, text, verseRef, null, imageUrl);
  }

  return (
    <div className="feed-page">
      <div className="feed-header">
        <button className="feed-back-btn" onClick={onClose}>← Biblia</button>
        <span className="feed-title">Feed Bíblico</span>
        {user && !user.isAnonymous ? (
          <button className="feed-new-btn" onClick={() => setShowNewPost(true)}>+ Publicar</button>
        ) : (
          <span />
        )}
      </div>

      <div className="feed-content">
        {feedLoading ? (
          <div className="feed-loading">Cargando publicaciones…</div>
        ) : posts.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">📖</div>
            <p>Ninguna publicación aún.</p>
            <p className="feed-empty-sub">¡Sé el primero en compartir una reflexión!</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              onSaveNote={onSaveNote}
              darkMode={darkMode}
            />
          ))
        )}
      </div>

      {showNewPost && (
        <NewPostModal
          user={user}
          books={books}
          onClose={() => setShowNewPost(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
