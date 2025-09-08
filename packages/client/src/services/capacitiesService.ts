import axios from 'axios';
import { ApiResponse, CapacityResult } from '@game/shared';
import { attachMetrics } from './httpInstrumentation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

attachMetrics(api, 'capacities');

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

export interface CapacitiesDTO {
  construction: CapacityResult;
  production: CapacityResult;
  research: CapacityResult;
}

// In-flight request coalescing (prevents parallel identical GETs from fanning out)
const inflightCapacities = new Map<string, Promise<ApiResponse<CapacitiesDTO>>>();

export const capacitiesService = {
  async getStatus(coord: string): Promise<ApiResponse<CapacitiesDTO>> {
    const key = `capacities:${coord}`;

    const existing = inflightCapacities.get(key);
    if (existing) {
      return existing;
    }

    const requestPromise = (async () => {
      try {
        const res = await api.get<ApiResponse<CapacitiesDTO>>(
          `/game/capacities/${encodeURIComponent(coord)}`
        );
        return res.data;
      } finally {
        inflightCapacities.delete(key);
      }
    })();

    inflightCapacities.set(key, requestPromise);
    return requestPromise;
  },
};

export default capacitiesService;
