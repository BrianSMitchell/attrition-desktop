import api from './api';
import { ApiResponse, DefenseKey, DefenseSpec } from '@game/shared';

// DTOs
export interface DefensesStatusDTO {
  techLevels: Record<string, number>;
  eligibility: Record<
    DefenseKey,
    {
      canStart: boolean;
      reasons: string[];
    }
  >;
}

export const defensesService = {
  async getCatalog(): Promise<ApiResponse<{ catalog: DefenseSpec[] }>> {
    const res = await api.get<ApiResponse<{ catalog: DefenseSpec[] }>>('/game/defenses/catalog');
    return res.data;
  },

  async getStatus(): Promise<ApiResponse<{ status: DefensesStatusDTO }>> {
    const res = await api.get<ApiResponse<{ status: DefensesStatusDTO }>>('/game/defenses/status');
    return res.data;
  },

  async start(locationCoord: string, defenseKey: DefenseKey): Promise<ApiResponse<any>> {
    try {
      const res = await api.post<ApiResponse<any>>('/game/defenses/start', { locationCoord, defenseKey });
      return res.data;
    } catch (err: any) {
      // Extract error details from axios response
      const status = err?.response?.status;
      const data = err?.response?.data ?? {};
      const code = data.code as string | undefined;
      const message = (data.message || data.error || 'Request failed') as string;

      // Soft-path for idempotency conflicts: return error data instead of throwing
      if (code === 'ALREADY_IN_PROGRESS' || status === 409) {
        return { 
          success: false, 
          code, 
          message, 
          details: data.details,
          reasons: data.reasons
        };
      }

      // For other errors, rethrow to maintain existing error handling
      throw err;
    }
  },
};

export default defensesService;
