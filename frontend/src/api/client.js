import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const client = axios.create({
  baseURL: API_BASE_URL,
});

function getTokens() {
  const raw = localStorage.getItem("garage_tokens");
  return raw ? JSON.parse(raw) : null;
}

function setTokens(tokens) {
  localStorage.setItem("garage_tokens", JSON.stringify(tokens));
}

function clearTokens() {
  localStorage.removeItem("garage_tokens");
}

client.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config._retried) {
      return Promise.reject(error);
    }

    const tokens = getTokens();
    if (!tokens?.refresh) {
      clearTokens();
      window.location.assign("/login");
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject, config });
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
        refresh: tokens.refresh,
      });
      setTokens({ ...tokens, access: data.access });
      pendingQueue.forEach(({ resolve, config: queuedConfig }) => {
        queuedConfig.headers.Authorization = `Bearer ${data.access}`;
        resolve(client(queuedConfig));
      });
      pendingQueue = [];
      config._retried = true;
      config.headers.Authorization = `Bearer ${data.access}`;
      return client(config);
    } catch (refreshError) {
      pendingQueue.forEach(({ reject: rejectQueued }) => rejectQueued(refreshError));
      pendingQueue = [];
      clearTokens();
      window.location.assign("/login");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const auth = {
  async login(username, password) {
    const { data } = await axios.post(`${API_BASE_URL}/auth/login/`, {
      username,
      password,
    });
    setTokens(data);
    return data;
  },
  logout() {
    clearTokens();
  },
  isAuthenticated() {
    return !!getTokens()?.access;
  },
};

export default client;
