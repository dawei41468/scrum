import http from './http';

export const createBacklogItem = async (item) => {
  const { data } = await http.post('/backlogs/', item);
  return data;
};

export const getBacklogItems = async () => {
  const { data } = await http.get('/backlogs/');
  return data;
};

export const getBacklogItem = async (id) => {
  const { data } = await http.get(`/backlogs/${id}`);
  return data;
};

export const updateBacklogItem = async (id, updateData) => {
  const { data } = await http.put(`/backlogs/${id}`, updateData);
  return data;
};

export const deleteBacklogItem = async (id) => {
  const { data } = await http.delete(`/backlogs/${id}`);
  return data;
};