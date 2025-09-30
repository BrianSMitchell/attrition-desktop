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
  arrival: string | null;
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

export interface FleetMovement {
  _id: string;
  status: 'pending' | 'travelling' | 'arrived' | 'recalled' | 'failed';
  originCoord: string;
  destinationCoord: string;
  departureTime: string;
  estimatedArrivalTime: string;
  actualArrivalTime?: string;
  travelTimeHours: number;
  distance: number;
  fleetSpeed: number;
  recallTime?: string;
  recallReason?: string;
}

export interface FleetStatusDTO {
  fleet: {
    _id: string;
    name: string;
    locationCoord: string;
    units: FleetUnitRow[];
    sizeCredits: number;
    isMoving: boolean;
    movement: {
      status: string;
      originCoord: string;
      destinationCoord: string;
      departureTime: string;
      estimatedArrivalTime: string;
      travelTimeHours: number;
      fleetSpeed: number;
      distance: number;
    } | null;
  };
  movement: FleetMovement | null;
}

export interface FleetDispatchDTO {
  movement: FleetMovement;
}

export interface FleetRecallDTO {
  movement: FleetMovement;
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

  // Public overview: stationed and inbound fleets for any empire at a base
  async getFleetsOverview(baseCoord: string): Promise<ApiResponse<FleetsListDTO>> {
    const res = await api.get<ApiResponse<FleetsListDTO>>('/game/fleets-overview', {
      params: { base: baseCoord }
    });
    return res.data;
  },

  async getFleet(id: string): Promise<ApiResponse<FleetDetailDTO>> {
    const res = await api.get<ApiResponse<FleetDetailDTO>>(`/game/fleets/${id}`);
    return res.data;
  },

  async getFleetStatus(id: string): Promise<ApiResponse<FleetStatusDTO>> {
    const res = await api.get<ApiResponse<FleetStatusDTO>>(`/game/fleets/${id}/status`);
    return res.data;
  },

  async dispatchFleet(id: string, destinationCoord: string): Promise<ApiResponse<FleetDispatchDTO>> {
    const res = await api.post<ApiResponse<FleetDispatchDTO>>(`/game/fleets/${id}/dispatch`, {
      destinationCoord
    });
    return res.data;
  },

  async recallFleet(id: string, reason?: string): Promise<ApiResponse<FleetRecallDTO>> {
    const res = await api.put<ApiResponse<FleetRecallDTO>>(`/game/fleets/${id}/recall`, {
      reason
    });
    return res.data;
  },

  async estimateTravelTime(fleetId: string, destinationCoord: string): Promise<ApiResponse<{ travelTimeHours: number; distance: number; fleetSpeed: number }>> {
    const res = await api.post<ApiResponse<{ travelTimeHours: number; distance: number; fleetSpeed: number }>>(`/game/fleets/${fleetId}/estimate-travel`, {
      destinationCoord
    });
    return res.data;
  }
};

export default fleetsService;
