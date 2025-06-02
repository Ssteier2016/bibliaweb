import React, { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import './ContentFilter.css';

const ContentFilter = ({ backgroundColor, backgroundImage, fontFamily, fontSize, textColor }) => {
  const [model, setModel] = useState(null);
  const [stats, setStats] = useState({ explicitCount: 0, lastDetected: null });
  const [verse, setVerse] = useState('');
  const [consented, setConsented] = useState(false);

  // Cargar el modelo NSFW.js al montar el componente
  useEffect(() => {
    async function loadModel() {
      await tf.ready();
      try {
        const loadedModel = await nsfwjs.load('/models/nsfwjs/');
        setModel(loadedModel);
      } catch (error) {
        console.error('Error loading NSFW.js model:', error);
      }
    }
    loadModel();
  }, []);

  // Manejar la carga de imágenes
  const handleImageUpload = async (event) => {
    if (!model) {
      alert('Modelo no cargado. Por favor, intenta de nuevo.');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        const predictions = await model.classify(img);
        const isExplicit = predictions.some(
          (pred) => pred.className === 'Porn' && pred.probability > 0.8
        );

        if (isExplicit) {
          setStats((prev) => ({
            explicitCount: prev.explicitCount + 1,
            lastDetected: new Date().toLocaleString(),
          }));
          setVerse('“Todo lo puedo en Cristo que me fortalece.” - Filipenses 4:13');
          alert('Contenido explícito detectado. Te sugerimos leer: ' + verse);
        } else {
          alert('Contenido seguro.');
        }
      } catch (error) {
        console.error('Error analyzing image:', error);
        alert('Error al analizar la imagen.');
      }
    };
  };

  if (!consented) {
    return (
      <div
        className="content-filter"
        style={{
          backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily,
          fontSize: `${fontSize}px`,
          color: textColor,
        }}
      >
        <h2>Filtro de Bienestar</h2>
        <p>Esta función analiza imágenes para detectar contenido explícito. Los datos se procesan localmente y no se almacenan. ¿Das tu consentimiento?</p>
        <button onClick={() => setConsented(true)}>Aceptar</button>
      </div>
    );
  }

  return (
    <div
      className="content-filter"
      style={{
        backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily,
        fontSize: `${fontSize}px`,
        color: textColor,
      }}
    >
      <h2>Filtro de Bienestar</h2>
      <p>Sube una imagen para verificar si es adecuada:</p>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <div className="stats">
        <p>Contenido explícito detectado: {stats.explicitCount} veces</p>
        <p>Última detección: {stats.lastDetected || 'Ninguna'}</p>
        {verse && <p>Versículo sugerido: {verse}</p>}
      </div>
    </div>
  );
};

export default ContentFilter;
