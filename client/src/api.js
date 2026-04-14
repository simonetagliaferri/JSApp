const BASE = 'http://localhost:3001/api';

async function call(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  getCurrentUser: () => call('/sessions/current'),
  login: (credentials) => call('/sessions', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => call('/sessions/current', { method: 'DELETE' }),
  startGame: () => call('/game/start', { method: 'POST' }),
  getCurrentGame: () => call('/game/current'),
  submitGuess: (payload) => call('/game/guess', { method: 'POST', body: JSON.stringify(payload) }),
  nextRound: () => call('/game/next', { method: 'POST' }),
  getHistory: () => call('/games/history'),
  startDemo: () => call('/demo/start', { method: 'POST' }),
  submitDemoGuess: (payload) => call('/demo/guess', { method: 'POST', body: JSON.stringify(payload) })
};
