import api from './api';
import { ApiResponse, UnitKey } from '@game/shared';

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
