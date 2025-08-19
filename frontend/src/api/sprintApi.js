import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    throw new Error('No token found, redirecting to login');
  }
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

// Handle 401 errors globally for all API calls
const handleError = (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized, redirecting to login');
  }
  throw error;
};

export const createSprint = async (sprint) => {
  try {
    const response = await axios.post(`${API_URL}/sprints/`, sprint, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getSprints = async () => {
  try {
    const response = await axios.get(`${API_URL}/sprints/`, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getSprint = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/sprints/${id}`, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateSprint = async (id, updateData) => {
  try {
    const response = await axios.put(`${API_URL}/sprints/${id}`, updateData, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteSprint = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/sprints/${id}`, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const addItemToSprint = async (sprintId, itemId) => {
  try {
    const response = await axios.post(`${API_URL}/sprints/${sprintId}/items/${itemId}`, null, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const removeItemFromSprint = async (sprintId, itemId) => {
  try {
    const response = await axios.delete(`${API_URL}/sprints/${sprintId}/items/${itemId}`, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getBurndown = async (sprintId) => {
  try {
    const response = await axios.get(`${API_URL}/sprints/${sprintId}/burndown`, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};