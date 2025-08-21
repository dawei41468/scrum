import http from './http';

export const createComment = async (comment) => {
  const { data } = await http.post('/comments/', comment);
  return data;
};

export const getCommentsForItem = async (itemId) => {
  const { data } = await http.get(`/comments/${itemId}`);
  return data;
};

export const deleteComment = async (commentId) => {
  const { data } = await http.delete(`/comments/${commentId}`);
  return data;
};

export const updateComment = async (commentId, text) => {
  const { data } = await http.patch(`/comments/${commentId}`, { text });
  return data;
};