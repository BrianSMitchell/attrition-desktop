import api, { ApiError } from "./api";
import { ApiResponse, BuildingKey, BuildingSpec } from "@game/shared";
import { ERROR_MESSAGES } from '@game/shared';


// Keep DTO type for UI typing (read-only usage during decommission)
export interface StructuresStatusDTO {
  techLevels: Record<string, number>;
  eligibility: Record<
    BuildingKey,
    {
      canStart: boolean;
      reasons: string[];
    }
  >;
}

function isApiErrorLike(err: unknown): err is ApiError {
  return (
    !!err &&
    typeof err === "object" &&
    typeof (err as any).code === "string" &&
    typeof (err as any).message === "string"
  );
}

// Decommissioned service (read-only): catalog only
export const structuresService = {
  async getCatalog(): Promise<ApiResponse<{ catalog: BuildingSpec[] }>> {
    try {
      const res = await api.get<ApiResponse<{ catalog: BuildingSpec[] }>>(
        "/game/structures/catalog"
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<{ catalog: BuildingSpec[] }>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: ERROR_MESSAGES.NETWORK_ERROR,
      } as ApiResponse<{ catalog: BuildingSpec[] }>;
    }
  },

  // v0: start a single active construction (no queuing)
  async start(coord: string, key: BuildingKey): Promise<ApiResponse<{ coord: string; key: BuildingKey; completesAt: string }>> {
    try {
      const res = await api.post<ApiResponse<{ coord: string; key: BuildingKey; completesAt: string }>>(
        `/game/structures/start`,
        { locationCoord: coord, catalogKey: key }
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) return err as any;
      return { success: false, code: "NETWORK_ERROR", message: ERROR_MESSAGES.NETWORK_ERROR } as any;
    }
  },

  // Cancel active construction at a base
  async cancelConstruction(coord: string): Promise<ApiResponse<{ cancelledStructure: string; refundedCredits: number | null }>> {
    try {
      const res = await api.delete<ApiResponse<{ cancelledStructure: string; refundedCredits: number | null }>>(
        `/game/structures/cancel/${encodeURIComponent(coord)}`
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<{ cancelledStructure: string; refundedCredits: number | null }>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: ERROR_MESSAGES.NETWORK_ERROR,
      } as ApiResponse<{ cancelledStructure: string; refundedCredits: number | null }>;
    }
  },
};

export default structuresService;


