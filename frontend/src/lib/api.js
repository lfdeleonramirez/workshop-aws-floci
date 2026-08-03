const getToken = () => localStorage.getItem('workshop_token')

async function request(url, options = {}) {
  const token = getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error de conexión' }))
    throw new Error(error.error || 'Error desconocido')
  }

  return res.json()
}

export const api = {
  // Misiones
  getMissions: () => request('/api/missions'),
  getMissionConfig: (id) => request(`/api/missions/${id}/config`),
  startMission: (id) => request(`/api/missions/${id}/start`, { method: 'POST' }),
  executeMissionAction: (id, action, params) =>
    request(`/api/missions/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ action, params })
    }),
  validateMission: (id) => request(`/api/missions/${id}/validate`, { method: 'POST' }),

  // Scoreboard
  getScoreboard: () => request('/api/scoreboard'),
  getMyScore: () => request('/api/scoreboard/me'),
  getBadges: () => request('/api/scoreboard/badges')
}
