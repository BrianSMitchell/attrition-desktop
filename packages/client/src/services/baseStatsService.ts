import api from './api';

export interface BaseStatsDTO {
  area: { total: number; used: number; free: number };
  energy: { produced: number; consumed: number; balance: number; rawBalance?: number; projectedBalance?: number };
  population: { used: number; capacity: number; free: number };
  citizens: { count: number; perHour: number };
  ownerIncomeCredPerHour: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// In-flight request coalescing (prevents parallel identical GETs from fanning out)
const inflightBaseStats = new Map<string, Promise<ApiResponse<{ stats: BaseStatsDTO }>>>();

export const baseStatsService = {
  async get(coord: string): Promise<ApiResponse<{ stats: BaseStatsDTO }>> {
    const key = `base-stats:${coord}`;

    const existing = inflightBaseStats.get(key);
    if (existing) {
      return existing;
    }

    const requestPromise = (async () => {
      try {
        const res = await api.get<ApiResponse<{ stats: BaseStatsDTO }>>(
          `/game/base-stats/${encodeURIComponent(coord)}`
        );
        return res.data;
      } finally {
        inflightBaseStats.delete(key);
      }
    })();

    inflightBaseStats.set(key, requestPromise);
    return requestPromise;
  },
};

export default baseStatsService;
