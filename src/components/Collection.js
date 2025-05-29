import React, { useState, useEffect } from 'react';

function Collection() {
  const [collection, setCollection] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    const storedCollection = JSON.parse(localStorage.getItem('collection') || '[]');
    setCollection(storedCollection);
  }, []);

  // Inicializar cuadrícula de 1700 posiciones
  const grid = Array(1700).fill(null).map((_, index) => {
    const card = collection[index] || null;
    return { position: index + 1, card };
  });

  const handleCardClick = (card, index) => {
    if (card) {
      setSelectedCard({ ...card, position: index + 1 });
    }
  };

  const closeCardDetails = () => {
    setSelectedCard(null);
  };

  return (
    <div className="collection">
      <h2>Colección</h2>
      <div className="grid">
        {grid.map((slot, index) => (
          <div
            key={index}
            className={`grid-item ${slot.card ? 'unlocked' : ''}`}
            onClick={() => handleCardClick(slot.card, index)}
          >
            {slot.card ? (
              <img src={slot.card.image} alt={slot.card.name} title={`${slot.card.name} (${slot.card.chapter})`} />
            ) : (
              slot.position
            )}
          </div>
        ))}
      </div>
      {selectedCard && (
        <div className="card-details" style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }}>
          <img src={selectedCard.image} alt={selectedCard.name} />
          <h3>{selectedCard.name}</h3>
          <p>Capítulo: {selectedCard.chapter}</p>
          <p>{selectedCard.description}</p>
          <button onClick={closeCardDetails}>Cerrar</button>
        </div>
      )}
    </div>
  );
}

export default Collection;
