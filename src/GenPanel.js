import React, { useState, useRef, useEffect, useMemo } from 'react';

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Si hay una clave en el entorno (Render / build-time), tiene prioridad sobre localStorage
const ENV_KEY = process.env.REACT_APP_GROQ_API_KEY || '';

const SYSTEM_PROMPT = `Eres Gen, un asistente bíblico especializado creado para la app Bibl.ia.
Tu única función es responder preguntas relacionadas con la Biblia: textos bíblicos, historia bíblica, teología, contexto cultural e histórico, idiomas originales (hebreo, griego, arameo), personajes bíblicos, geografía bíblica, comentarios de teólogos, tipología bíblica, arqueología bíblica y temas afines.
Respondés en español, de forma clara, respetuosa y bien fundamentada.
Si el usuario hace una pregunta que no tiene relación con la Biblia, decile amablemente que solo podés responder preguntas bíblicas y pedile que reformule su pregunta.
Cuando cites versículos, indicá el libro, capítulo y versículo (ej: Juan 3:16).`;

export default function GenPanel({ onClose, darkMode, initialVerse }) {
  const [apiKey,     setApiKey]     = useState(() => ENV_KEY || localStorage.getItem('groq_api_key') || '');
  const [configured, setConfigured] = useState(() => !!(ENV_KEY || localStorage.getItem('groq_api_key')));
  const [keyInput,   setKeyInput]   = useState('');
  const [messages,   setMessages]   = useState(() => {
    if (initialVerse) {
      return [
        {
          role: 'gen',
          text: `¡Hola! Soy Gen, tu asistente bíblico. Veo que querés hacer preguntas específicamente sobre **${initialVerse.bookName} ${initialVerse.chapter}:${initialVerse.verse}**:\n\n"${initialVerse.text}"\n\n¿Qué te gustaría consultar sobre este versículo? 🤖✨`
        }
      ];
    }
    return [
      { role: 'gen', text: '¡Hola! Soy Gen, tu asistente bíblico. ¿Qué querés saber sobre la Biblia hoy? 📖' }
    ];
  });
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [limitWarning, setLimitWarning] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (configured) inputRef.current?.focus();
  }, [configured]);

  useEffect(() => {
    const limitCheck = checkAndRegisterUsage(0, true);
    if (!limitCheck.allowed) {
      setLimitWarning(limitCheck.warning);
    } else {
      setLimitWarning('');
    }
  }, []);

  function saveKey() {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem('groq_api_key', k);
    setApiKey(k);
    setConfigured(true);
  }

  function clearKey() {
    if (ENV_KEY) return; // clave de entorno: no se puede cambiar desde el cliente
    localStorage.removeItem('groq_api_key');
    setApiKey('');
    setKeyInput('');
    setConfigured(false);
  }

  const systemPrompt = useMemo(() => {
    let prompt = SYSTEM_PROMPT;
    if (initialVerse) {
      prompt += `\n\nEl usuario está consultando específicamente sobre el versículo: ${initialVerse.bookName} ${initialVerse.chapter}:${initialVerse.verse} ("${initialVerse.text}").
Enfoca tus explicaciones, contexto histórico, traducción lingüística, teología y respuestas principalmente en este versículo y sus pasajes paralelos, y asiste de forma muy completa al usuario con su duda específica.`;
    }
    return prompt;
  }, [initialVerse]);

  function checkAndRegisterUsage(newChars = 0, dryRun = false) {
    const WINDOW_MS = 60 * 60 * 1000;    // 1 hora
    const SESSION_MS = 10 * 60 * 1000;   // 10 minutos
    const LIMIT_CHARS = 20000;          // 20,000 caracteres / tokens
    
    const rawLogs = localStorage.getItem('gen_usage_logs');
    let logs = [];
    try {
      if (rawLogs) logs = JSON.parse(rawLogs);
    } catch (e) {
      logs = [];
    }
    
    const now = Date.now();
    const activeLogs = logs.filter(l => now - l.timestamp < WINDOW_MS);
    
    if (activeLogs.length > 0) {
      const sessionStart = activeLogs[0].timestamp;
      const totalChars = activeLogs.reduce((sum, l) => sum + l.chars, 0);
      const elapsedSessionMs = now - sessionStart;
      
      if (totalChars >= LIMIT_CHARS || elapsedSessionMs >= SESSION_MS) {
        const resumeTime = new Date(sessionStart + WINDOW_MS);
        const hh = String(resumeTime.getHours()).padStart(2, '0');
        const mm = String(resumeTime.getMinutes()).padStart(2, '0');
        return {
          allowed: false,
          warning: `Límite alcanzado (máximo 10 minutos de uso o 20,000 caracteres por hora). Podrás seguir usando la IA a las ${hh}:${mm} hs.`
        };
      }
    }
    
    if (!dryRun && newChars > 0) {
      activeLogs.push({ timestamp: now, chars: newChars });
      localStorage.setItem('gen_usage_logs', JSON.stringify(activeLogs));
    }
    
    return { allowed: true, warning: '' };
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    // Verificar límites de tokens (caracteres en 10 min)
    const limitCheck = checkAndRegisterUsage(0, true);
    if (!limitCheck.allowed) {
      setLimitWarning(limitCheck.warning);
      return;
    }
    setLimitWarning('');

    const userMsg = { role: 'user', text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter(m => m.role === 'user' || (m.role === 'gen' && history.indexOf(m) > 0))
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
    ];

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: groqMessages,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `Error ${res.status}`;
        setMessages(prev => [...prev, { role: 'gen', text: `⚠️ ${msg}` }]);
        setLoading(false);
        return;
      }

      const data  = await res.json();
      const reply = data?.choices?.[0]?.message?.content || '(Sin respuesta)';
      
      // Registrar consumo de caracteres (pregunta + respuesta)
      checkAndRegisterUsage(text.length + reply.length, false);

      setMessages(prev => [...prev, { role: 'gen', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'gen', text: '⚠️ Error de conexión. Verificá tu clave API.' }]);
    }

    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="gen-fullscreen">
      <div className="gen-header">
        <button className="gen-back-btn" onClick={onClose}>← Biblia</button>
        <div className="gen-header-center">
          <div className="gen-avatar">✨</div>
          <div>
            <div className="gen-name">Gen</div>
            <div className="gen-subtitle">Asistente bíblico · Groq</div>
          </div>
        </div>
        <div className="gen-header-right">
          {configured && !ENV_KEY && (
            <button className="gen-key-btn" onClick={clearKey} title="Cambiar clave API">🔑</button>
          )}
        </div>
      </div>

      {!configured ? (
        <div className="gen-setup">
          <div className="gen-setup-icon">✨</div>
          <div className="gen-setup-title">Configurar Gen</div>
          <div className="gen-setup-desc">
            Gen usa Groq (Llama 3.3). Ingresá tu clave API gratuita de Groq para comenzar.
            <br />
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="gen-setup-link"
            >
              Obtener clave en console.groq.com →
            </a>
          </div>
          <input
            className="gen-key-input"
            type="password"
            placeholder="gsk_…"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveKey()}
            autoFocus
          />
          <button className="gen-setup-btn" onClick={saveKey} disabled={!keyInput.trim()}>
            Guardar y comenzar
          </button>
        </div>
      ) : (
        <>
          <div className="gen-messages">
            {messages.map((m, i) => (
              <div key={i} className={`gen-bubble gen-bubble-${m.role}`}>
                {m.role === 'gen' && <div className="gen-bubble-avatar">✨</div>}
                <div className="gen-bubble-text">{m.text}</div>
              </div>
            ))}
            {loading && (
              <div className="gen-bubble gen-bubble-gen">
                <div className="gen-bubble-avatar">✨</div>
                <div className="gen-bubble-text gen-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {limitWarning && (
            <div className="gen-limit-warning" style={{ margin: '0 16px 10px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#ef4444', fontSize: '0.82rem', textAlign: 'center', fontWeight: '500' }}>
              ⚠️ {limitWarning}
            </div>
          )}

          <div className="gen-input-row">
            <textarea
              ref={inputRef}
              className="gen-input"
              placeholder={limitWarning ? 'Límite de uso alcanzado' : 'Preguntale algo a Gen sobre la Biblia…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading || !!limitWarning}
            />
            <button
              className="gen-send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || loading || !!limitWarning}
            >
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  );
}
