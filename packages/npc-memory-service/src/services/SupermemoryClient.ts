export interface Memory {
  memoryType: string;
  content: string;
  timestamp: number;
  contextId: string;
}

export interface MemoryResponse {
  id: string;
  status: string;
}

export class SupermemoryClient {
  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
  }

  async storeMemory(memory: Memory): Promise<MemoryResponse> {
    try {
      const response = await fetch('https://api.supermemory.local/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(memory)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }
}