const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 10000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 1024;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://labibl-ia.onrender.com,http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;
const MAX_MESSAGES = 30;
const MAX_TOTAL_CHARS = 20000;

const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    hits.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

// Evita que el Map crezca sin límite con IPs que ya no vuelven a pegar.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) hits.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/chat', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: 'El servidor de IA no está configurado todavía.' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Demasiadas preguntas. Probá de nuevo más tarde.' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Falta el historial de mensajes.' });
  }
  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: 'La conversación es demasiado larga.' });
  }

  let totalChars = 0;
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || !['system', 'user', 'assistant'].includes(m.role)) {
      return res.status(400).json({ error: 'Formato de mensaje inválido.' });
    }
    totalChars += m.content.length;
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return res.status(400).json({ error: 'La conversación es demasiado larga.' });
  }

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: MAX_TOKENS }),
    });

    const data = await groqRes.json().catch(() => ({}));
    if (!groqRes.ok) {
      const msg = data?.error?.message || `Error ${groqRes.status} al consultar la IA.`;
      return res.status(502).json({ error: msg });
    }

    const reply = data?.choices?.[0]?.message?.content || '(Sin respuesta)';
    res.json({ reply });
  } catch {
    res.status(502).json({ error: 'No se pudo conectar con el servicio de IA.' });
  }
});

app.listen(PORT, () => {
  console.log(`bibl-ia-ai-proxy escuchando en el puerto ${PORT}`);
});
