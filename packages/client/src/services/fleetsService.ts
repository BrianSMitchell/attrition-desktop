import axios from 'axios';
import { ApiResponse, UnitKey } from '@game/shared';
import { attachMetrics } from './httpInstrumentation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
attachMetrics(api, 'fleets');

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

export interface BaseUnitsDTO {
  base: string;
  counts: Record<UnitKey, number>;
  total: number;
}

export interface FleetListRow {
  _id: string;
  name: string;
  ownerName: string;
  arrival: null;
  sizeCredits: number;
}
export interface FleetsListDTO {
  fleets: FleetListRow[];
}

export interface FleetUnitRow {
  unitKey: string;
  name: string;
  count: number;
}

export interface FleetDetailDTO {
  fleet: {
    _id: string;
    name: string;
    locationCoord: string;
    ownerName: string;
    units: FleetUnitRow[];
    sizeCredits: number;
  };
}

const fleetsService = {
  async getBaseUnits(baseCoord: string): Promise<ApiResponse<BaseUnitsDTO>> {
    const res = await api.get<ApiResponse<BaseUnitsDTO>>('/game/base-units', { params: { base: baseCoord } });
    return res.data;
  },

  async getFleets(baseCoord?: string): Promise<ApiResponse<FleetsListDTO>> {
    const res = await api.get<ApiResponse<FleetsListDTO>>('/game/fleets', {
      params: baseCoord ? { base: baseCoord } : undefined
    });
    return res.data;
  },

  async getFleet(id: string): Promise<ApiResponse<FleetDetailDTO>> {
    const res = await api.get<ApiResponse<FleetDetailDTO>>(`/game/fleets/${id}`);
    return res.data;
  }
};

export default fleetsService;
