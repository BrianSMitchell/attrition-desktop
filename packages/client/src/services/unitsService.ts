import api from './api';
import { ApiResponse, UnitKey, UnitSpec } from '@game/shared';

// DTOs
export interface UnitsStatusDTO {
  techLevels: Record<string, number>;
  eligibility: Record<
    UnitKey,
    {
      canStart: boolean;
      reasons: string[];
    }
  >;
}

export const unitsService = {
  async getCatalog(): Promise<ApiResponse<{ catalog: UnitSpec[] }>> {
    const res = await api.get<ApiResponse<{ catalog: UnitSpec[] }>>('/game/units/catalog');
    return res.data;
  },

  async getStatus(): Promise<ApiResponse<{ status: UnitsStatusDTO }>> {
    const res = await api.get<ApiResponse<{ status: UnitsStatusDTO }>>('/game/units/status');
    return res.data;
  },

  async start(locationCoord: string, unitKey: UnitKey): Promise<ApiResponse<any>> {
    try {
      const res = await api.post<ApiResponse<any>>('/game/units/start', { locationCoord, unitKey });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data ?? {};
      const code = data.code as string | undefined;
      const message = (data.message || data.error || 'Request failed') as string;
      
      if (code === 'ALREADY_IN_PROGRESS' || status === 409) {
        // Soft-path: return error response instead of throwing
        return { success: false, code, message, details: data.details, reasons: data.reasons };
      }
      throw err; // let caller handle other errors
    }
  },
};

export default unitsService;
