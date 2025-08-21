// Lightweight Planning Poker WebSocket client
// Uses the REST API base URL to derive ws/wss endpoint

function getApiBase() {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  return base.replace(/\/$/, '');
}

function toWsUrl(pathname) {
  const base = getApiBase();
  try {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = pathname.replace(/^\//, '/');
    url.search = ''; // caller adds query
    return url;
  } catch {
    // Fallback if REACT_APP_API_URL is not a full URL (shouldn't happen)
    const isHttps = base.startsWith('https');
    return new URL(`${isHttps ? 'wss' : 'ws'}://${base.replace(/^https?:\/\//, '')}${pathname}`);
  }
}

export function connectPlanningWS({ sessionId, token, onMessage }) {
  if (!sessionId) throw new Error('sessionId is required');
  if (!token) throw new Error('JWT token is required');

  const url = toWsUrl(`/planning/ws/${sessionId}`);
  if (token) {
    url.searchParams.set('token', token);
  }

  const ws = new WebSocket(url.toString());

  // Heartbeat to keep connection alive (30s)
  let heartbeat;
  ws.addEventListener('open', () => {
    heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send('ping'); } catch {}
      }
    }, 30000);
  });

  ws.addEventListener('message', (evt) => {
    try {
      const data = JSON.parse(evt.data);
      onMessage && onMessage(data);
    } catch {
      // ignore non-JSON
    }
  });

  const cleanup = () => {
    try { clearInterval(heartbeat); } catch {}
    try { ws.close(); } catch {}
  };

  ws.addEventListener('close', () => cleanup());
  ws.addEventListener('error', () => cleanup());

  return { socket: ws, disconnect: cleanup };
}
