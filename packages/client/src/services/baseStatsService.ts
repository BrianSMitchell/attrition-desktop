import axios from 'axios';
import { attachMetrics } from './httpInstrumentation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

attachMetrics(api, 'base-stats');

// Auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      if (parsed.state?.token) {
        (config.headers as any).Authorization = `Bearer ${parsed.state.token}`;
      }
    } catch (e) {
      console.error('Error parsing auth token', e);
    }
  }
  return config;
});

// 401 handling
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface BaseStatsDTO {
  area: { total: number; used: number; free: number };
  energy: { produced: number; consumed: number; balance: number };
  population: { used: number; capacity: number; free: number };
  ownerIncomeCredPerHour: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// In-flight request coalescing (prevents parallel identical GETs from fanning out)
const inflightBaseStats = new Map<string, Promise<ApiResponse<{ stats: BaseStatsDTO }>>>();

export const baseStatsService = {
  async get(coord: string): Promise<ApiResponse<{ stats: BaseStatsDTO }>> {
    const key = `base-stats:${coord}`;

    const existing = inflightBaseStats.get(key);
    if (existing) {
      return existing;
    }

    const requestPromise = (async () => {
      try {
        const res = await api.get<ApiResponse<{ stats: BaseStatsDTO }>>(
          `/game/base-stats/${encodeURIComponent(coord)}`
        );
        return res.data;
      } finally {
        inflightBaseStats.delete(key);
      }
    })();

    inflightBaseStats.set(key, requestPromise);
    return requestPromise;
  },
};

export default baseStatsService;
