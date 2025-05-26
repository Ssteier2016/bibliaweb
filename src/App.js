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

  // Función para simular comentarios de IA
  function getMockComment(verse, type) {
    if (verse === 16) {
      if (type === 'teologico') return 'Expresa el amor sacrificial de Dios, un pilar del cristianismo.';
      if (type === 'historico') return 'Escrito en un contexto de tensión entre cristianos y judíos en el siglo I.';
      if (type === 'cultural') return 'El término "mundo" (kosmos) refleja una visión inclusiva en la cultura grecorromana.';
      if (type === 'linguistico') return 'La palabra "unigénito" (monogenes) en griego enfatiza la unicidad de Jesús.';
    }
    return 'Comentario en desarrollo...';
  }

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
            <p>Comentario {selectedComment}: {getMockComment(verse.verse, selectedComment)}</p>
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
