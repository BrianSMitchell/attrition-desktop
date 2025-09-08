import api, { ApiError } from "./api";
import { ApiResponse } from "@game/shared";

export interface ServerStatusData {
  status: string;
  version: string;
  startedAt: string;
  uptimeSeconds: number;
  playersOnline: number;
  socketsConnected: number;
}

function isApiErrorLike(err: unknown): err is ApiError {
  return (
    !!err &&
    typeof err === "object" &&
    typeof (err as any).code === "string" &&
    typeof (err as any).message === "string"
  );
}

export const statusService = {
  async getStatus(): Promise<ApiResponse<ServerStatusData>> {
    try {
      const response = await api.get<ApiResponse<ServerStatusData>>("/status");
      return response.data;
    } catch (err) {
      // Normalize to canonical DTO for callers that expect ApiResponse
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<ServerStatusData>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<ServerStatusData>;
    }
  },
};

export default statusService;
