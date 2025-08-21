import http from './http';

export const createTask = async (task) => {
  const { data } = await http.post('/tasks/', task);
  return data;
};

export const getTasks = async () => {
  const { data } = await http.get('/tasks/');
  return data;
};

export const getTask = async (id) => {
  const { data } = await http.get(`/tasks/${id}`);
  return data;
};

export const updateTask = async (id, updateData) => {
  const { data } = await http.put(`/tasks/${id}`, updateData);
  return data;
};

export const deleteTask = async (id) => {
  const { data } = await http.delete(`/tasks/${id}`);
  return data;
};

export const setTaskRank = async (id, rank) => {
  const { data } = await http.patch(`/tasks/${id}/rank`, { rank });
  return data;
};

export const bulkUpdateTask = async (id, payload) => {
  const { data } = await http.patch(`/tasks/${id}/bulk`, payload);
  return data;
};

export const getSubtasksByTask = async (id) => {
  const { data } = await http.get(`/tasks/${id}/subtasks`);
  return data;
};

export const moveTask = async (id, storyId) => {
  const { data } = await http.patch(`/tasks/${id}/move`, { story_id: storyId });
  return data;
};
