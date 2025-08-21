import http from './http'

// List audits for an entity/id pair
// Backend: GET /audits/?entity=<string>&entity_id=<string>
export async function listAudits({ entity, entity_id }) {
  if (!entity || !entity_id) throw new Error('entity and entity_id are required')
  const { data } = await http.get('/audits/', { params: { entity, entity_id } })
  return data
}
