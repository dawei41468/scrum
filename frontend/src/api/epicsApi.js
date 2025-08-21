import http from './http';

export const createEpic = async (epic) => {
  const { data } = await http.post('/epics/', epic);
  return data;
};

export const getEpics = async () => {
  const { data } = await http.get('/epics/');
  return data;
};

export const getEpic = async (id) => {
  const { data } = await http.get(`/epics/${id}`);
  return data;
};

export const updateEpic = async (id, updateData) => {
  const { data } = await http.put(`/epics/${id}`, updateData);
  return data;
};

export const deleteEpic = async (id) => {
  const { data } = await http.delete(`/epics/${id}`);
  return data;
};

export const setEpicRank = async (id, rank) => {
  const { data } = await http.patch(`/epics/${id}/rank`, { rank });
  return data;
};

export const bulkUpdateEpic = async (id, payload) => {
  const { data } = await http.patch(`/epics/${id}/bulk`, payload);
  return data;
};
