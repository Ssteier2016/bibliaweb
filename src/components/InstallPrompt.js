useEffect(() => {
  const handler = (e) => {
    e.preventDefault();
    setDeferredPrompt(e);
    setTimeout(() => {
      e.prompt();
      e.userChoice.then((choiceResult) => {
        console.log(choiceResult.outcome === 'accepted' ? 'Instalada' : 'Rechazada');
        setDeferredPrompt(null);
      });
    }, 10000); // Mostrar tras 10 segundos
  };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);
