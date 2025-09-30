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

// Production queue item interface
export interface UnitProductionItem {
  id: string;
  unitKey: UnitKey;
  unitName: string;
  quantity: number;
  totalQuantity: number;
  startedAt: string;
  completesAt: string;
  creditsCost: number;
  baseCoord: string;
}

export const unitsService = {
  async getCatalog(): Promise<ApiResponse<{ catalog: UnitSpec[] }>> {
    const res = await api.get<ApiResponse<{ catalog: UnitSpec[] }>>('/game/units/catalog');
    return res.data;
  },

  async getStatus(locationCoord?: string): Promise<ApiResponse<{ status: UnitsStatusDTO }>> {
    const params = locationCoord ? { locationCoord } : undefined;
    const res = await api.get<ApiResponse<{ status: UnitsStatusDTO }>>(
      '/game/units/status',
      { params }
    );
    return res.data;
  },

  async start(locationCoord: string, unitKey: UnitKey): Promise<ApiResponse<any>> {
    console.log('🚀 Starting unit production:', { locationCoord, unitKey });
    try {
      const res = await api.post<ApiResponse<any>>('/game/units/start', { locationCoord, unitKey });
      console.log('✅ Unit start successful:', res.data);
      return res.data;
    } catch (err: any) {
      // Log the complete error for debugging
      console.error('🚨 Full axios error object:', err);
      console.error('🚨 Error response:', err?.response);
      console.error('🚨 Error request:', err?.request);
      console.error('🚨 Error message:', err?.message);
      
      const status = err?.response?.status;
      const data = err?.response?.data ?? {};
      const code = data.code as string | undefined;
      const message = (data.message || data.error || err?.message || 'Request failed') as string;
      const reasons = data.reasons || [];
      
      // Log structured error details
      console.error('🚨 Parsed error details:', {
        status,
        code,
        message,
        reasons,
        details: data.details,
        hasResponse: !!err?.response,
        hasRequest: !!err?.request,
        fullResponseData: data
      });
      
      // Handle common error status codes with soft-path error responses
      if (status === 400 || status === 409 || code === 'ALREADY_IN_PROGRESS') {
        // Return structured error response for validation errors
        return { success: false, code, message, details: data.details, reasons };
      }
      throw err; // let caller handle other errors
    }
  },

  async getProductionQueue(baseCoord?: string): Promise<ApiResponse<{ queue: UnitProductionItem[] }>> {
    try {
      const params = baseCoord ? { base: baseCoord } : undefined;
      const res = await api.get<ApiResponse<{ queue: UnitProductionItem[] }>>(
        '/game/units/queue',
        { params }
      );
      return res.data;
    } catch (err: any) {
      const data = err?.response?.data ?? {};
      const code = data.code as string | undefined;
      const message = (data.message || data.error || 'Failed to get production queue') as string;
      
      return {
        success: false,
        code: code || 'NETWORK_ERROR',
        message,
        details: data.details
      } as ApiResponse<{ queue: UnitProductionItem[] }>;
    }
  },

  async cancelProduction(itemId: string): Promise<ApiResponse<{ cancelledId: string; refundedCredits: number | null }>> {
    try {
      const res = await api.delete<ApiResponse<{ cancelledId: string; refundedCredits: number | null }>>(
        `/game/units/queue/${encodeURIComponent(itemId)}`
      );
      return res.data;
    } catch (err: any) {
      const data = err?.response?.data ?? {};
      const code = data.code as string | undefined;
      const message = (data.message || data.error || 'Failed to cancel production') as string;
      
      return {
        success: false,
        code: code || 'NETWORK_ERROR',
        message,
        details: data.details
      } as ApiResponse<{ cancelledId: string; refundedCredits: number | null }>;
    }
  },
};

export default unitsService;
