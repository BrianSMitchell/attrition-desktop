import api, { ApiError } from "./api";
import { ApiResponse, TechnologyKey, TechnologySpec } from "@game/shared";

export interface TechStatusDTO {
  techLevels: Partial<Record<TechnologyKey, number>>;
  baseLabTotal: number;
  eligibility: Record<TechnologyKey, { canStart: boolean; reasons: string[] }>;
}

function isApiErrorLike(err: unknown): err is ApiError {
  return (
    !!err &&
    typeof err === "object" &&
    typeof (err as any).code === "string" &&
    typeof (err as any).message === "string"
  );
}

export const techService = {
  async getCatalog(): Promise<ApiResponse<{ catalog: TechnologySpec[] }>> {
    try {
      const res = await api.get<ApiResponse<{ catalog: TechnologySpec[] }>>(
        "/game/tech/catalog"
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<{ catalog: TechnologySpec[] }>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<{ catalog: TechnologySpec[] }>;
    }
  },

  async getStatus(
    baseCoord: string
  ): Promise<ApiResponse<{ status: TechStatusDTO }>> {
    try {
      const res = await api.get<ApiResponse<{ status: TechStatusDTO }>>(
        `/game/tech/status`,
        { params: { base: baseCoord } }
      );
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<{ status: TechStatusDTO }>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<{ status: TechStatusDTO }>;
    }
  },

  async start(
    locationCoord: string,
    techKey: TechnologyKey
  ): Promise<ApiResponse<any>> {
    try {
      const res = await api.post<ApiResponse<any>>("/game/tech/start", {
        locationCoord,
        techKey,
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
            reasons:
              (err.details && (err.details.reasons as string[] | undefined)) ||
              undefined,
          } as ApiResponse<any>;
        }
        // Other errors: bubble for global handling
        throw err;
      }
      // Unknown error
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<any>;
    }
  },

  async getQueue(baseCoord?: string): Promise<ApiResponse<{ queue: any[] }>> {
    try {
      const params = baseCoord ? { base: baseCoord } : undefined;
      const res = await api.get<ApiResponse<{ queue: any[] }>>(
        "/game/tech/queue",
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

  async cancelQueueItem(
    id: string
  ): Promise<ApiResponse<{ cancelledId: string; refundedCredits: number | null }>> {
    try {
      const res = await api.delete<
        ApiResponse<{ cancelledId: string; refundedCredits: number | null }>
      >(`/game/tech/queue/${encodeURIComponent(id)}`);
      return res.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<{ cancelledId: string; refundedCredits: number | null }>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<{ cancelledId: string; refundedCredits: number | null }>;
    }
  },
};

export default techService;
