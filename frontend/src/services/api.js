import axios from 'axios';

// Get base URL from environment or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Connection API calls
export const connectToIB = async (host, port, clientId) => {
  try {
    const response = await api.post('/connect', { host, port, client_id: clientId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to connect to Interactive Brokers' };
  }
};

export const disconnectFromIB = async () => {
  try {
    const response = await api.post('/disconnect');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to disconnect from Interactive Brokers' };
  }
};

export const getConnectionStatus = async () => {
  try {
    const response = await api.get('/status');
    return response.data;
  } catch (error) {
    return { connected: false, client_id: null };
  }
};

// Portfolio data API calls
export const getPortfolioData = async () => {
  try {
    const response = await api.get('/portfolio');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch portfolio data' };
  }
};

// Options API calls
export const getOptionChain = async (ticker) => {
  try {
    const response = await api.get(`/option_chain?ticker=${ticker}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch option chain' };
  }
};

export const getOptionsData = async (ticker, expiration) => {
  try {
    const response = await api.get(`/options?ticker=${ticker}&expiration=${expiration}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch options data' };
  }
};

export default {
  connectToIB,
  disconnectFromIB,
  getConnectionStatus,
  getPortfolioData,
  getOptionChain,
  getOptionsData,
};