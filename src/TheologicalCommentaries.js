import React, { useState, useMemo } from 'react';
import { MACARTHUR_COMMENTARY } from './data/macarthur';
import { CSLEWIS_COMMENTARY }   from './data/cslewis';

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
              🔗 Ver sermón / fuente en gty.org
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function AuthorView({ author, onBack, darkMode }) {
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
        <div className="tc-author-badge" style={{ background: author.color }}>
          {author.initials}
        </div>
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

export default function TheologicalCommentaries({ onClose, darkMode }) {
  const [selectedAuthor, setSelectedAuthor] = useState(null);

  if (selectedAuthor) {
    return (
      <div className={`tc-fullscreen${darkMode ? ' dark' : ''}`}>
        <AuthorView
          author={selectedAuthor}
          onBack={() => setSelectedAuthor(null)}
          darkMode={darkMode}
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
            <div className="tc-author-avatar" style={{ background: author.color }}>
              {author.initials}
            </div>
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
          <div className="tc-more-sub">C.H. Spurgeon · R.C. Sproul · Matthew Henry · John Calvin</div>
        </div>
      </div>
    </div>
  );
}
