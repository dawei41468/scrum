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

export const createBacklogItem = async (item) => {
  try {
    const response = await axios.post(`${API_URL}/backlogs/`, item, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getBacklogItems = async () => {
  try {
    const response = await axios.get(`${API_URL}/backlogs/`, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getBacklogItem = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/backlogs/${id}`, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateBacklogItem = async (id, updateData) => {
  try {
    const response = await axios.put(`${API_URL}/backlogs/${id}`, updateData, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteBacklogItem = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/backlogs/${id}`, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};