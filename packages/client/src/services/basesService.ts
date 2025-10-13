import api, { ApiError } from "./api";
import { ApiResponse, BuildingKey, CapacityResult } from "@game/shared";
import { ERROR_MESSAGES } from '../../server/src/constants/response-formats';


// Types for combined base stats + capacities
export interface BaseStatsDTO {
  area: { total: number; used: number; free: number };
  energy: { produced: number; consumed: number; balance: number };
  population: { used: number; capacity: number; free: number };
  ownerIncomeCredPerHour: number;
}

export interface BasesStatsData {
  coord: string;
  stats: BaseStatsDTO;
  capacities: {
    construction: CapacityResult;
    production: CapacityResult;
    research: CapacityResult;
  };
}

// Types for per-base structures listing
export interface BaseStructureItem {
  key: BuildingKey;
  name: string;
  currentLevel: number;
  nextLevel: number;
  creditsCostNext: number;
  energyDelta: number;
  requires: Array<{ key: string; level: number }>;
  canStart: boolean;
  reasons: string[];
  etaMinutes: number;
}

export interface BaseStructuresData {
  coord: string;
  constructionPerHour: number;
  items: BaseStructureItem[];
  activeConstruction?: { key: BuildingKey; completionAt: string } | null;
}

export interface BaseDefensesData {
  coord: string;
  defenseLevels: Array<{ key: string; name: string; level: number; energyDelta: number }>;
  inProgress: Array<{ key: string; name: string; completesAt: string | null }>;
}

function isApiErrorLike(err: unknown): err is ApiError {
  return (
    !!err &&
    typeof err === "object" &&
    typeof (err as any).code === "string" &&
    typeof (err as any).message === "string"
  );
}

export const basesService = {
  async getBaseStats(coord: string): Promise<ApiResponse<BasesStatsData>> {
    try {
      const res = await api.get<ApiResponse<BasesStatsData>>(
        `/game/bases/${encodeURIComponent(coord)}/stats`
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<BasesStatsData>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: ERROR_MESSAGES.NETWORK_ERROR,
      } as ApiResponse<BasesStatsData>;
    }
  },

  async getBaseStructures(coord: string): Promise<ApiResponse<BaseStructuresData>> {
    try {
      const res = await api.get<ApiResponse<BaseStructuresData>>(
        `/game/bases/${encodeURIComponent(coord)}/structures`
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<BaseStructuresData>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: ERROR_MESSAGES.NETWORK_ERROR,
      } as ApiResponse<BaseStructuresData>;
    }
  },

  async getBaseDefenses(coord: string): Promise<ApiResponse<BaseDefensesData>> {
    try {
      const res = await api.get<ApiResponse<BaseDefensesData>>(
        `/game/bases/${encodeURIComponent(coord)}/defenses`
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<BaseDefensesData>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: ERROR_MESSAGES.NETWORK_ERROR,
      } as ApiResponse<BaseDefensesData>;
    }
  },
};

export default basesService;


