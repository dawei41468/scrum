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

export const createComment = async (comment) => {
  try {
    const response = await axios.post(`${API_URL}/comments/`, comment, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getCommentsForItem = async (itemId) => {
  try {
    const response = await axios.get(`${API_URL}/comments/${itemId}`, getAuthConfig());
    return response.data;
  } catch (error) {
    handleError(error);
  }
};