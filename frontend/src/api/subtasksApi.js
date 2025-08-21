import http from './http';

export const createSubtask = async (subtask) => {
  const { data } = await http.post('/subtasks/', subtask);
  return data;
};

export const getSubtasks = async () => {
  const { data } = await http.get('/subtasks/');
  return data;
};

export const getSubtask = async (id) => {
  const { data } = await http.get(`/subtasks/${id}`);
  return data;
};

export const updateSubtask = async (id, updateData) => {
  const { data } = await http.put(`/subtasks/${id}`, updateData);
  return data;
};

export const deleteSubtask = async (id) => {
  const { data } = await http.delete(`/subtasks/${id}`);
  return data;
};

export const setSubtaskRank = async (id, rank) => {
  const { data } = await http.patch(`/subtasks/${id}/rank`, { rank });
  return data;
};

export const bulkUpdateSubtask = async (id, payload) => {
  const { data } = await http.patch(`/subtasks/${id}/bulk`, payload);
  return data;
};

export const moveSubtask = async (id, parentTaskId) => {
  const { data } = await http.patch(`/subtasks/${id}/move`, { parent_task_id: parentTaskId });
  return data;
};
