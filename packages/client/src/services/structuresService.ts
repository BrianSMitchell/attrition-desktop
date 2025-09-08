import api, { ApiError } from "./api";
import { ApiResponse, BuildingKey, BuildingSpec } from "@game/shared";

// DTOs
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
        message: "Network error",
      } as ApiResponse<{ catalog: BuildingSpec[] }>;
    }
  },

  async getStatus(): Promise<ApiResponse<{ status: StructuresStatusDTO }>> {
    try {
      const res = await api.get<ApiResponse<{ status: StructuresStatusDTO }>>(
        "/game/structures/status"
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<{ status: StructuresStatusDTO }>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<{ status: StructuresStatusDTO }>;
    }
  },

  async start(
    locationCoord: string,
    buildingKey: BuildingKey
  ): Promise<ApiResponse<any>> {
    try {
      const res = await api.post<ApiResponse<any>>("/game/structures/start", {
        locationCoord,
        buildingKey,
      });
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        // Soft-path for idempotency conflicts: return error data instead of throwing
        if (
          err.code === "ALREADY_IN_PROGRESS" ||
          err.status === 409 ||
          err.code === "HTTP_409"
        ) {
          return {
            success: false,
            code: err.code,
            message: err.message,
            details: err.details,
            // preserve optional reasons array if provided by server
            reasons:
              (err.details && (err.details.reasons as string[] | undefined)) ||
              undefined,
          } as ApiResponse<any>;
        }

        // For other errors, bubble normalized ApiError for global handling
        throw err;
      }

      // Non-axios/unknown error: wrap as generic network error for callers that catch DTO
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<any>;
    }
  },

  // List queued structures (inactive Building docs). Optional base filter.
  async getQueue(baseCoord?: string): Promise<ApiResponse<{ queue: any[] }>> {
    try {
      const params = baseCoord ? { base: baseCoord } : undefined;
      const res = await api.get<ApiResponse<{ queue: any[] }>>(
        "/game/structures/queue",
        { params }
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<{ queue: any[] }>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<{ queue: any[] }>;
    }
  },

  // Cancel a queued structure item by its _id
  async cancelQueueItem(
    id: string
  ): Promise<
    ApiResponse<{
      cancelledId: string;
      revertedUpgrade?: boolean;
      deleted?: boolean;
      refundedCredits?: number;
    }>
  > {
    try {
      const res = await api.delete<
        ApiResponse<{
          cancelledId: string;
          revertedUpgrade?: boolean;
          deleted?: boolean;
          refundedCredits?: number;
        }>
      >(`/game/structures/queue/${id}`);
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        };
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      };
    }
  },
};

export default structuresService;
