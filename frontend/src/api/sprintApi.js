import http from './http';

export const createSprint = async (sprint) => {
  const { data } = await http.post('/sprints/', sprint);
  return data;
};

export const getSprints = async () => {
  const { data } = await http.get('/sprints/');
  return data;
};

export const getSprint = async (id) => {
  const { data } = await http.get(`/sprints/${id}`);
  return data;
};

export const updateSprint = async (id, updateData) => {
  const { data } = await http.put(`/sprints/${id}`, updateData);
  return data;
};

export const deleteSprint = async (id) => {
  const { data } = await http.delete(`/sprints/${id}`);
  return data;
};

export const addItemToSprint = async (sprintId, itemId) => {
  const { data } = await http.post(`/sprints/${sprintId}/items/${itemId}`);
  return data;
};

export const removeItemFromSprint = async (sprintId, itemId) => {
  const { data } = await http.delete(`/sprints/${sprintId}/items/${itemId}`);
  return data;
};

export const getBurndown = async (sprintId) => {
  const { data } = await http.get(`/sprints/${sprintId}/burndown`);
  return data;
};