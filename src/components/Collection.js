import React, { useState } from 'react';
import charactersData from '../data/characters.json';

function Collection() {
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const collection = JSON.parse(localStorage.getItem('collection') || '[]');

  const handleCardClick = (character) => {
    setSelectedCharacter(character);
  };

  const handleCloseModal = () => {
    setSelectedCharacter(null);
  };

  return (
    <div className="collection">
      <h2>Colección de Cartas</h2>
      <div className="grid">
        {charactersData.map((character, index) => {
          const isUnlocked = collection.some((c) => c.name === character.name);
          return (
            <div
              key={index}
              className={`grid-item ${isUnlocked ? 'unlocked' : ''}`}
              onClick={() => isUnlocked && handleCardClick(character)}
              style={{ cursor: isUnlocked ? 'pointer' : 'default' }}
            >
              {isUnlocked ? (
                <img
                  src={character.image}
                  alt={character.name}
                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = 'https://cdn.pixabay.com/photo/2016/11/29/08/43/biblical-1868760_960_720.jpg';
                    console.log(`Error loading image for ${character.name}: ${character.image}`);
                  }}
                />
              ) : (
                <span>???</span>
              )}
            </div>
          );
        })}
      </div>
      {selectedCharacter && (
        <div
          className="modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
            }}
          >
            <img
              src={selectedCharacter.image}
              alt={selectedCharacter.name}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              onError={(e) => {
                e.target.src = 'https://cdn.pixabay.com/photo/2016/11/29/08/43/biblical-1868760_960_720.jpg';
                console.log(`Error loading modal image for ${selectedCharacter.name}`);
              }}
            />
            <button
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              ✕
            </button>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '10px',
                textAlign: 'center',
              }}
            >
              <h3 style={{ margin: '0' }}>{selectedCharacter.name}</h3>
              <p style={{ margin: '5px 0' }}>{selectedCharacter.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Collection;
