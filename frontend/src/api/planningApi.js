import http from './http'

export async function createPlanningSession({ story_id, scale = 'fibonacci' }) {
  const { data } = await http.post('/planning/sessions', { story_id, scale })
  return data
}

export async function getPlanningSession(sessionId) {
  const { data } = await http.get(`/planning/sessions/${sessionId}`)
  return data
}

export async function submitVote(sessionId, value) {
  const { data } = await http.post(`/planning/sessions/${sessionId}/vote`, { value })
  return data
}

export async function revealVotes(sessionId) {
  const { data } = await http.post(`/planning/sessions/${sessionId}/reveal`)
  return data
}

export async function setFinalEstimate(sessionId, final_estimate) {
  const { data } = await http.put(`/planning/sessions/${sessionId}/estimate`, { final_estimate })
  return data
}
