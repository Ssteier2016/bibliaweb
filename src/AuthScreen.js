import React, { useState } from 'react';
import { signInGoogle, signInEmail, registerEmail, signInGuest } from './firebase';
import logo from './logo3.png';

const ERR = {
  'auth/user-not-found':      'No existe una cuenta con ese correo.',
  'auth/wrong-password':      'Contraseña incorrecta.',
  'auth/invalid-credential':  'Correo o contraseña incorrectos.',
  'auth/email-already-in-use':'Ese correo ya está registrado.',
  'auth/weak-password':       'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email':       'El correo no es válido.',
  'auth/too-many-requests':   'Demasiados intentos. Intentá más tarde.',
};
function errMsg(code) { return ERR[code] || 'Ocurrió un error. Intentá de nuevo.'; }

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function AuthScreen({ darkMode }) {
  const [mode,    setMode]    = useState('login');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function run(fn) {
    setLoading(true); setError('');
    try { await fn(); }
    catch (e) { setError(errMsg(e.code)); setLoading(false); }
  }

  return (
    <div className={`auth-screen ${darkMode ? 'dark' : ''}`}>
      <div className="auth-card">
        <div className="auth-logo"><img src={logo} alt="Bibl.ia" style={{ width: 72, height: 72, objectFit: 'contain' }} /></div>
        <h1 className="auth-title">Bibl.ia</h1>
        <p className="auth-subtitle">Tu Biblia digital</p>

        <button
          className="auth-google-btn"
          onClick={() => run(signInGoogle)}
          disabled={loading}
        >
          <GoogleIcon /> Continuar con Google
        </button>

        <div className="auth-divider"><span>o</span></div>

        <div className="auth-form">
          <input
            className="auth-input"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Contraseña"
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onKeyDown={e => e.key === 'Enter' && run(() =>
              mode === 'login' ? signInEmail(email, pass) : registerEmail(email, pass)
            )}
          />
          {error && <div className="auth-error">{error}</div>}
          <button
            className="auth-submit-btn"
            onClick={() => run(() =>
              mode === 'login' ? signInEmail(email, pass) : registerEmail(email, pass)
            )}
            disabled={loading || !email || !pass}
          >
            {loading ? '…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
          <button
            className="auth-toggle-btn"
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? '¿No tenés cuenta? Crear una' : '¿Ya tenés cuenta? Iniciar sesión'}
          </button>
        </div>

        <div className="auth-guest-row">
          <button className="auth-guest-btn" onClick={() => run(signInGuest)} disabled={loading}>
            Entrar como invitado
          </button>
        </div>
      </div>
    </div>
  );
}
