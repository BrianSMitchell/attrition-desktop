import api from './api';
import { ApiResponse } from '@game/shared';

import type { BaseCapacitiesDTO } from '@game/shared';

export const capacitiesService = {
  async getStatus(coord: string): Promise<ApiResponse<BaseCapacitiesDTO>> {
    const res = await api.get<ApiResponse<BaseCapacitiesDTO>>(`/game/capacities/${encodeURIComponent(coord)}`);
    return res.data;
  },
};

