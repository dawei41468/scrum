import http from './http';

export const createBacklogItem = async (item) => {
  const { data } = await http.post('/items/', item);
  return data;
};

export const getBacklogItems = async () => {
  const { data } = await http.get('/items/');
  return data;
};

export const getBacklogItem = async (id) => {
  const { data } = await http.get(`/items/${id}`);
  return data;
};

export const updateBacklogItem = async (id, updateData) => {
  const { data } = await http.put(`/items/${id}`, updateData);
  return data;
};

export const deleteBacklogItem = async (id) => {
  const { data } = await http.delete(`/items/${id}`);
  return data;
};