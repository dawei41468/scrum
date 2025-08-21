import http from './http';

export const createStory = async (story) => {
  const { data } = await http.post('/stories/', story);
  return data;
};

export const getStories = async () => {
  const { data } = await http.get('/stories/');
  return data;
};

export const getStory = async (id) => {
  const { data } = await http.get(`/stories/${id}`);
  return data;
};

export const updateStory = async (id, updateData) => {
  const { data } = await http.put(`/stories/${id}`, updateData);
  return data;
};

export const deleteStory = async (id) => {
  const { data } = await http.delete(`/stories/${id}`);
  return data;
};

export const setStoryRank = async (id, rank) => {
  const { data } = await http.patch(`/stories/${id}/rank`, { rank });
  return data;
};

export const bulkUpdateStory = async (id, payload) => {
  const { data } = await http.patch(`/stories/${id}/bulk`, payload);
  return data;
};

export const getTasksByStory = async (id) => {
  const { data } = await http.get(`/stories/${id}/tasks`);
  return data;
};
