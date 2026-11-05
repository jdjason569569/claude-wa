// Bot de WhatsApp de la barbería (open-wa 5.10.0)
// Escucha los mensajes entrantes por /api/events, le pide la respuesta al backend de la
// barbería (POST /whatsapp/reply) y la envía con /api/messages/sendText.
//
// Uso:
//   1. Arranca la API:   ./start.sh
//   2. Arranca el bot:   node bot.js
//   Backend local:       BACKEND_URL=http://localhost:3000 node bot.js
//   Otro puerto open-wa: API_URL=http://localhost:8081 node bot.js

const API_URL = process.env.API_URL || 'http://localhost:8080';
const BACKEND_URL = process.env.BACKEND_URL || 'https://iabarber.onrender.com';

// Render apaga el backend gratuito cuando no se usa y tarda ~50 s en despertar.
const BACKEND_TIMEOUT_MS = 60_000;

const RESPONDER_EN_GRUPOS = false;

// ── Lógica ──────────────────────────────────────────────────────────────

async function pedirRespuesta(text, clientName) {
  const res = await fetch(`${BACKEND_URL}/whatsapp/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, clientName }),
    signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`backend ${res.status}: ${await res.text()}`);
  const { reply } = await res.json();
  return reply || null;
}

async function enviarTexto(to, content) {
  const res = await fetch(`${API_URL}/api/messages/sendText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, content }),
  });
  if (!res.ok) throw new Error(`sendText ${res.status}: ${await res.text()}`);
}

async function manejarMensaje(msg) {
  if (!msg || msg.fromMe || msg.isMdHistoryMsg) return; // historial sincronizado: no responder
  const chatId = msg.chatId?._serialized || msg.chatId || msg.from;
  if (!chatId || chatId === 'status@broadcast') return;
  if (msg.isGroupMsg && !RESPONDER_EN_GRUPOS) return;

  const texto = typeof msg.body === 'string' && msg.type === 'chat' ? msg.body : msg.text || '';
  if (!texto) return; // audios, fotos, stickers... se ignoran

  const nombre = msg.sender?.pushname;
  console.log(`📩 ${nombre || chatId}: ${texto}`);

  try {
    const respuesta = await pedirRespuesta(texto, nombre);
    if (!respuesta) return;
    await enviarTexto(chatId, respuesta);
    console.log(`📤 -> ${chatId}: ${respuesta.split('\n')[0]}`);
  } catch (err) {
    console.error('❌ No se pudo responder:', err.message);
  }
}

// Lee el flujo de eventos (Server-Sent Events) y reconecta si se corta.
async function escucharEventos() {
  for (;;) {
    try {
      const res = await fetch(`${API_URL}/api/events`, {
        headers: { Accept: 'text/event-stream' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`✅ Bot escuchando mensajes en ${API_URL} (backend: ${BACKEND_URL})`);

      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let fin;
        while ((fin = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, fin);
          buffer = buffer.slice(fin + 2);
          const data = frame
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trim())
            .join('\n');
          if (!data) continue;
          let evento;
          try {
            evento = JSON.parse(data);
          } catch {
            continue;
          }
          if (evento.event === 'message.received') {
            await manejarMensaje(evento.payload?.message);
          }
        }
      }
      console.warn('⚠️  Se cerró la conexión con la API, reconectando...');
    } catch (err) {
      console.warn(`⚠️  Sin conexión con la API (${err.message}), reintentando en 5 s...`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

escucharEventos();
