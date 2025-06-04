import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('PWA instalada');
      }
      setDeferredPrompt(null);
    };
  };

  if (!deferredPrompt) return null;

  return (
    <div className="install-prompt">
      <p>¡Instala Bibl.ia en tu dispositivo!</p>
      <button onClick={handleInstallClick}>Instalar</button>
    </div>
  );
}

export default InstallPrompt;
