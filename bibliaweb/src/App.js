import React, { useState } from 'react';
import bibleData from './data/reina_valera.json';
import './App.css';

function App() {
  const [selectedComment, setSelectedComment] = useState('none');
  const [searchQuery, setSearchQuery] = useState('');
  const book = bibleData.books.find(b => b.name === 'Juan');
  const chapter = book.chapters[0]; // Juan 3
  const verses = chapter.verses.filter(verse =>
    verse.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="App">
      <h1>Biblia Web</h1>
      <input
        type="text"
        placeholder="Buscar versículos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <select onChange={(e) => setSelectedComment(e.target.value)}>
        <option value="none">Seleccionar comentario</option>
        <option value="teologico">Teológico</option>
        <option value="historico">Histórico</option>
        <option value="cultural">Cultural</option>
        <option value="linguistico">Lingüístico</option>
      </select>
      {verses.map(verse => (
        <div key={verse.verse} className="verse">
          <p><strong>{verse.verse}</strong>: {verse.text}</p>
          {selectedComment !== 'none' && (
            <p>Comentario {selectedComment}: (Aquí va el comentario de la IA)</p>
          )}
          <textarea
            placeholder="Escribe tu nota..."
            defaultValue={localStorage.getItem(`note_${verse.verse}`) || ''}
            onBlur={(e) => localStorage.setItem(`note_${verse.verse}`, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export default App;
