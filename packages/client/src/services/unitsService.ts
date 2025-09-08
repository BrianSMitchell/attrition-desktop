import axios from 'axios';
import { ApiResponse, UnitKey, UnitSpec } from '@game/shared';
import { attachMetrics } from './httpInstrumentation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
attachMetrics(api, 'units');

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

// DTOs
export interface UnitsStatusDTO {
  techLevels: Record<string, number>;
  eligibility: Record<
    UnitKey,
    {
      canStart: boolean;
      reasons: string[];
    }
  >;
}

export const unitsService = {
  async getCatalog(): Promise<ApiResponse<{ catalog: UnitSpec[] }>> {
    const res = await api.get<ApiResponse<{ catalog: UnitSpec[] }>>('/game/units/catalog');
    return res.data;
  },

  async getStatus(): Promise<ApiResponse<{ status: UnitsStatusDTO }>> {
    const res = await api.get<ApiResponse<{ status: UnitsStatusDTO }>>('/game/units/status');
    return res.data;
  },

  async start(locationCoord: string, unitKey: UnitKey): Promise<ApiResponse<any>> {
    try {
      const res = await api.post<ApiResponse<any>>('/game/units/start', { locationCoord, unitKey });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data ?? {};
      const code = data.code as string | undefined;
      const message = (data.message || data.error || 'Request failed') as string;
      
      if (code === 'ALREADY_IN_PROGRESS' || status === 409) {
        // Soft-path: return error response instead of throwing
        return { success: false, code, message, details: data.details, reasons: data.reasons };
      }
      throw err; // let caller handle other errors
    }
  },
};

export default unitsService;
