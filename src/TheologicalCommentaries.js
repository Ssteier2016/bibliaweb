import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MACARTHUR_COMMENTARY } from './data/macarthur';
import { CSLEWIS_COMMENTARY }   from './data/cslewis';
import { SPURGEON_COMMENTARY }  from './data/spurgeon';
import { loadAuthorPhotos, saveAuthorPhoto, saveAuthorPhotoURL, ADMIN_EMAIL } from './firebase';

const AUTHORS = [
  {
    id: 'macarthur',
    name: 'John MacArthur',
    years: '1940–presente',
    tradition: 'Bautista Reformada · Cesacionista · Premilenarista',
    bio: 'Pastor de Grace Community Church (Sun Valley, CA) desde 1969. Presidente del The Master\'s Seminary. Conocido por su predicación expositiva versículo a versículo y su defensa de la inerrancia bíblica. Serie de comentarios del NT: 50+ volúmenes (Moody Press).',
    commentary: MACARTHUR_COMMENTARY,
    color: '#1a4fa0',
    initials: 'JM',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/John_MacArthur_2007.jpg/440px-John_MacArthur_2007.jpg',
  },
  {
    id: 'cslewis',
    name: 'C.S. Lewis',
    years: '1898–1963',
    tradition: 'Anglicana · Apologética · Cristiano Mere',
    bio: 'Profesor de Oxford y Cambridge, convertido del ateísmo en 1931. Literato, apologeta y novelista cristiano. Sus obras abordan la Biblia desde la razón, la imaginación y la experiencia personal. Obras clave: Mero Cristianismo, Los Cuatro Amores, El Peso de la Gloria, Reflexiones sobre los Salmos, Milagros.',
    commentary: CSLEWIS_COMMENTARY,
    color: '#6b3a2a',
    initials: 'CS',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/C.s.lewis3.JPG/440px-C.s.lewis3.JPG',
  },
  {
    id: 'spurgeon',
    name: 'Charles H. Spurgeon',
    years: '1834–1892',
    tradition: 'Bautista Calvinista · Predicación Expositiva · Puritanismo Moderno',
    bio: 'Conocido como "el Príncipe de los Predicadores". Pastor del Metropolitan Tabernacle de Londres durante 38 años. Predicó a más de 10 millones de personas en su vida. Sus obras —The Treasury of David, Metropolitan Tabernacle Pulpit (63 vol.), Morning and Evening, All of Grace— son dominio público y siguen siendo las más leídas del protestantismo histórico.',
    commentary: SPURGEON_COMMENTARY,
    color: '#4a1c6e',
    initials: 'SP',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Charles_Spurgeon_by_Alexander_Bassano%2C_1885.jpg/440px-Charles_Spurgeon_by_Alexander_Bassano%2C_1885.jpg',
  },
];

const BOOKS_ORDER = [
  'Génesis','Éxodo','Levítico','Números','Deuteronomio','Josué','Jueces','Rut',
  '1 Samuel','2 Samuel','1 Reyes','2 Reyes','1 Crónicas','2 Crónicas',
  'Esdras','Nehemías','Ester','Job','Salmos','Proverbios','Eclesiastés','Cantares',
  'Isaías','Jeremías','Lamentaciones','Ezequiel','Daniel',
  'Oseas','Joel','Amós','Abdías','Jonás','Miqueas','Nahúm','Habacuc','Sofonías','Hageo','Zacarías','Malaquías',
  'Mateo','Marcos','Lucas','Juan','Hechos','Romanos',
  '1 Corintios','2 Corintios','Gálatas','Efesios','Filipenses','Colosenses',
  '1 Tesalonicenses','2 Tesalonicenses','1 Timoteo','2 Timoteo','Tito','Filemón',
  'Hebreos','Santiago','1 Pedro','2 Pedro','1 Juan','2 Juan','3 Juan','Judas','Apocalipsis',
];

function AuthorAvatar({ author, size = 52, badgeSize = false, customPhoto, isAdmin, onUpload }) {
  const [imgError,   setImgError]   = React.useState(false);
  const [uploading,  setUploading]  = React.useState(false);
  const [showMenu,   setShowMenu]   = React.useState(false);
  const [urlMode,    setUrlMode]    = React.useState(false);
  const [urlVal,     setUrlVal]     = React.useState('');
  const fileRef = useRef();
  const dim      = badgeSize ? 40 : size;
  const fontSize = badgeSize ? '1rem' : '1.25rem';
  const photo    = customPhoto || null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setShowMenu(false);
    const result = await saveAuthorPhoto(author.id, file);
    setUploading(false);
    if (result === 'PERMISSION_DENIED') alert('Sin permisos en Firestore.');
    else if (result) onUpload?.(author.id, result);
    e.target.value = '';
  }

  async function handleURL() {
    const trimmed = urlVal.trim();
    if (!trimmed) return;
    setUploading(true); setShowMenu(false); setUrlMode(false); setUrlVal('');
    const result = await saveAuthorPhotoURL(author.id, trimmed);
    setUploading(false);
    if (result === 'PERMISSION_DENIED') alert('Sin permisos en Firestore.');
    else if (result) onUpload?.(author.id, result);
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: dim, height: dim }}>
      {photo && !imgError ? (
        <img
          src={photo}
          alt={author.name}
          onError={() => setImgError(true)}
          style={{ width: dim, height: dim, borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${author.color}` }}
        />
      ) : (
        <div style={{
          width: dim, height: dim, borderRadius: '50%',
          background: author.color, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontSize, fontWeight: 800,
        }}>
          {uploading ? '⏳' : author.initials}
        </div>
      )}

      {isAdmin && !badgeSize && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(m => !m); setUrlMode(false); setUrlVal(''); }}
            title="Cambiar foto"
            style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 22, height: 22, borderRadius: '50%',
              background: '#1a4fa0', border: '2px solid #fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, color: '#fff', zIndex: 2,
            }}
          >📷</button>

          {showMenu && (
            <div
              className="photo-menu-popup"
              style={{ position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
              onClick={e => e.stopPropagation()}
            >
              {!urlMode ? (
                <>
                  <button className="photo-menu-opt" onClick={() => { fileRef.current?.click(); setShowMenu(false); }}>
                    📁 Subir archivo
                  </button>
                  <button className="photo-menu-opt" onClick={() => setUrlMode(true)}>
                    🔗 Pegar URL
                  </button>
                </>
              ) : (
                <div className="photo-url-row">
                  <input
                    className="photo-url-input"
                    placeholder="https://..."
                    value={urlVal}
                    onChange={e => setUrlVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleURL()}
                    autoFocus
                  />
                  <button className="photo-url-confirm" onClick={handleURL}>✓</button>
                  <button className="photo-url-cancel" onClick={() => setUrlMode(false)}>✕</button>
                </div>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </>
      )}
    </div>
  );
}

function groupByBook(commentary) {
  const map = {};
  commentary.forEach(entry => {
    const book = entry.libro;
    if (!map[book]) map[book] = [];
    map[book].push(entry);
  });
  return map;
}

function CommentaryCard({ entry, expanded, onToggle }) {
  return (
    <div className={`tc-card${expanded ? ' tc-card-expanded' : ''}`} onClick={onToggle}>
      <div className="tc-card-header">
        <div className="tc-card-ref">{entry.ref}</div>
        <div className="tc-card-title">{entry.titulo}</div>
        <span className="tc-card-chevron">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="tc-card-body" onClick={e => e.stopPropagation()}>
          <p className="tc-card-text">{entry.texto}</p>
          <div className="tc-card-obra">📖 {entry.obra}</div>
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="tc-card-source-link"
            >
              🔗 Ver fuente original
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function AuthorView({ author, onBack, darkMode, authorPhotos }) {
  const [search, setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null);
  const [selBook, setSelBook]   = useState('todos');

  const bookGroups = useMemo(() => groupByBook(author.commentary), [author.commentary]);

  const filtered = useMemo(() => {
    let entries = author.commentary;
    if (selBook !== 'todos') entries = entries.filter(e => e.libro === selBook);
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        e.ref.toLowerCase().includes(q) ||
        e.titulo.toLowerCase().includes(q) ||
        e.texto.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [author.commentary, selBook, search]);

  const availableBooks = useMemo(() =>
    BOOKS_ORDER.filter(b => bookGroups[b]),
    [bookGroups]
  );

  function toggle(idx) {
    setExpanded(prev => prev === idx ? null : idx);
  }

  return (
    <div className="tc-author-view">
      <div className="tc-author-topbar">
        <button className="tc-back-btn" onClick={onBack}>← Autores</button>
        <AuthorAvatar author={author} size={44} badgeSize customPhoto={authorPhotos?.[author.id]} />
        <div className="tc-author-info">
          <span className="tc-author-name">{author.name}</span>
          <span className="tc-author-tradition">{author.tradition}</span>
        </div>
      </div>

      <div className="tc-author-bio">{author.bio}</div>

      <div className="tc-filters">
        <input
          className="tc-search"
          placeholder="Buscar versículo o tema…"
          value={search}
          onChange={e => { setSearch(e.target.value); setExpanded(null); }}
        />
        <select
          className="tc-book-select"
          value={selBook}
          onChange={e => { setSelBook(e.target.value); setExpanded(null); }}
        >
          <option value="todos">Todos los libros</option>
          {availableBooks.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div className="tc-count">
        {filtered.length} comentario{filtered.length !== 1 ? 's' : ''}
      </div>

      <div className="tc-cards-list">
        {filtered.length === 0 ? (
          <div className="tc-empty">No se encontraron comentarios.</div>
        ) : (
          filtered.map((entry, i) => (
            <CommentaryCard
              key={`${entry.ref}-${i}`}
              entry={entry}
              expanded={expanded === i}
              onToggle={() => toggle(i)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function TheologicalCommentaries({ onClose, darkMode, currentUser }) {
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [authorPhotos, setAuthorPhotos]     = useState({});
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    loadAuthorPhotos().then(setAuthorPhotos);
  }, []);

  function handlePhotoUpload(authorId, base64) {
    setAuthorPhotos(prev => ({ ...prev, [authorId]: base64 }));
  }

  if (selectedAuthor) {
    return (
      <div className={`tc-fullscreen${darkMode ? ' dark' : ''}`}>
        <AuthorView
          author={selectedAuthor}
          onBack={() => setSelectedAuthor(null)}
          darkMode={darkMode}
          authorPhotos={authorPhotos}
        />
      </div>
    );
  }

  return (
    <div className={`tc-fullscreen${darkMode ? ' dark' : ''}`}>
      <div className="tc-header">
        <button className="tc-close-btn" onClick={onClose}>← Biblia</button>
        <span className="tc-header-title">Comentarios Teológicos</span>
        <span />
      </div>

      <div className="tc-intro">
        Comentarios de teólogos y pastores reconocidos, organizados por versículo.
        Seleccioná un autor para explorar sus enseñanzas.
      </div>

      <div className="tc-authors-grid">
        {AUTHORS.map(author => (
          <button
            key={author.id}
            className="tc-author-card"
            onClick={() => setSelectedAuthor(author)}
          >
            <AuthorAvatar
              author={author}
              size={58}
              customPhoto={authorPhotos[author.id]}
              isAdmin={isAdmin}
              onUpload={handlePhotoUpload}
            />
            <div className="tc-author-card-info">
              <div className="tc-author-card-name">{author.name}</div>
              <div className="tc-author-card-years">{author.years}</div>
              <div className="tc-author-card-tradition">{author.tradition}</div>
              <div className="tc-author-card-count">{author.commentary.length} comentarios</div>
            </div>
            <span className="tc-author-card-arrow">›</span>
          </button>
        ))}

        <div className="tc-more-soon">
          <div className="tc-more-icon">📚</div>
          <div className="tc-more-text">Más autores próximamente</div>
          <div className="tc-more-sub">R.C. Sproul · Matthew Henry · John Calvin · Charles Wesley</div>
        </div>
      </div>
    </div>
  );
}
