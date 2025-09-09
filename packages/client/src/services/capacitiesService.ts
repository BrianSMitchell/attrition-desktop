import api from './api';
import { ApiResponse, CapacityResult } from '@game/shared';

export interface CapacitiesDTO {
  construction: CapacityResult;
  production: CapacityResult;
  research: CapacityResult;
}

// In-flight request coalescing (prevents parallel identical GETs from fanning out)
const inflightCapacities = new Map<string, Promise<ApiResponse<CapacitiesDTO>>>();

export const capacitiesService = {
  async getStatus(coord: string): Promise<ApiResponse<CapacitiesDTO>> {
    const key = `capacities:${coord}`;

    const existing = inflightCapacities.get(key);
    if (existing) {
      return existing;
    }

    const requestPromise = (async () => {
      try {
        const res = await api.get<ApiResponse<CapacitiesDTO>>(
          `/game/capacities/${encodeURIComponent(coord)}`
        );
        return res.data;
      } finally {
        inflightCapacities.delete(key);
      }
    })();

    inflightCapacities.set(key, requestPromise);
    return requestPromise;
  },
};

export default capacitiesService;
