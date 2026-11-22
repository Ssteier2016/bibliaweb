const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 1024;

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;
const MAX_MESSAGES = 30;
const MAX_TOTAL_CHARS = 20000;

// Estado en memoria del Worker (se reinicia entre despliegues/reinicios de instancia,
// suficiente como freno básico de abuso; no necesita persistencia real).
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

function corsHeaders(origin, allowedOrigins) {
  const headers = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export default {
  async fetch(request, env) {
    const allowedOrigins = (env.ALLOWED_ORIGINS || 'https://labibl-ia.onrender.com')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, allowedOrigins);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({ ok: true }, 200, cors);
    }

    if (url.pathname !== '/api/chat' || request.method !== 'POST') {
      return json({ error: 'Not found' }, 404, cors);
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: 'El servidor de IA no está configurado todavía.' }, 503, cors);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(ip)) {
      return json({ error: 'Demasiadas preguntas. Probá de nuevo más tarde.' }, 429, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'JSON inválido.' }, 400, cors);
    }

    const { messages } = body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Falta el historial de mensajes.' }, 400, cors);
    }
    if (messages.length > MAX_MESSAGES) {
      return json({ error: 'La conversación es demasiado larga.' }, 400, cors);
    }

    let totalChars = 0;
    for (const m of messages) {
      if (!m || typeof m.content !== 'string' || !['system', 'user', 'assistant'].includes(m.role)) {
        return json({ error: 'Formato de mensaje inválido.' }, 400, cors);
      }
      totalChars += m.content.length;
    }
    if (totalChars > MAX_TOTAL_CHARS) {
      return json({ error: 'La conversación es demasiado larga.' }, 400, cors);
    }

    try {
      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: MAX_TOKENS }),
      });

      const data = await groqRes.json().catch(() => ({}));
      if (!groqRes.ok) {
        const msg = data?.error?.message || `Error ${groqRes.status} al consultar la IA.`;
        return json({ error: msg }, 502, cors);
      }

      const reply = data?.choices?.[0]?.message?.content || '(Sin respuesta)';
      return json({ reply }, 200, cors);
    } catch {
      return json({ error: 'No se pudo conectar con el servicio de IA.' }, 502, cors);
    }
  },
};
