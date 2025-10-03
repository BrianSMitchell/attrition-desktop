import api from './api';
import { ApiResponse } from '@game/shared';

import type { BaseCapacitiesDTO } from '@game/shared';

// Simple in-flight deduplication and short-lived cache to prevent request bursts
const inFlight = new Map<string, Promise<ApiResponse<BaseCapacitiesDTO>>>();
const cache = new Map<string, { ts: number; data: ApiResponse<BaseCapacitiesDTO> }>();
const CACHE_TTL_MS = 2000; // 2 seconds is enough to coalesce UI-driven bursts

export const capacitiesService = {
  async getStatus(coord: string): Promise<ApiResponse<BaseCapacitiesDTO>> {
    const key = encodeURIComponent(coord);

    // Serve from short-lived cache if fresh
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts <= CACHE_TTL_MS) {
      return cached.data;
    }

    // Reuse in-flight request if one exists for this coord
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        const res = await api.get<ApiResponse<BaseCapacitiesDTO>>(`/game/capacities/${key}`);
        // Cache successful response briefly to avoid immediate re-fetches
        cache.set(key, { ts: Date.now(), data: res.data });
        return res.data;
      } finally {
        inFlight.delete(key);
      }
    })();

    inFlight.set(key, promise);
    return promise;
  },
};
