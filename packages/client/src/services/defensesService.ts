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
  currentLevels?: Record<string, number>;
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

  // Start a defense at a base. Always return a normalized ApiResponse on business errors
  // so callers can show the actual reason instead of a generic ERROR_MESSAGES.NETWORK_ERROR.
  async start(locationCoord: string, defenseKey: DefenseKey): Promise<ApiResponse<any>> {
    try {
      const res = await api.post<ApiResponse<any>>('/game/defenses/start', { locationCoord, defenseKey });
      return res.data;
    } catch (err: any) {
      // Normalize axios error -> ApiResponse shape expected by callers
      const status = err?.response?.status as number | undefined;
      const data = (err?.response?.data ?? {}) as any;
      const code = (data.code as string | undefined) ?? (status ? `HTTP_${status}` : 'SERVER_ERROR');
      const message = (data.message || data.error || 'Request failed') as string;

      return {
        success: false,
        code,
        message,
        details: data.details,
        reasons: data.reasons,
      } as ApiResponse<any>;
    }
  },

  async getQueue(locationCoord?: string): Promise<ApiResponse<{ queue: Array<{ id: string; defenseKey: DefenseKey; startedAt?: string; completesAt?: string; baseCoord: string }> }>> {
    const params = locationCoord ? { locationCoord } : undefined;
    const res = await api.get<ApiResponse<{ queue: any[] }>>('/game/defenses/queue', { params });
    return res.data as any;
  },

  async cancelQueue(id: string): Promise<ApiResponse<{ cancelledId: string }>> {
    const res = await api.delete<ApiResponse<{ cancelledId: string }>>(`/game/defenses/queue/${encodeURIComponent(id)}`);
    return res.data;
  }
};

export default defensesService;


