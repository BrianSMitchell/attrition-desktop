import { SupermemoryClient } from '../SupermemoryClient';

const mockFetch = jest.fn();

describe('SupermemoryClient', () => {
  let client: SupermemoryClient;

  beforeEach(() => {
    (globalThis as any).fetch = mockFetch;
    mockFetch.mockReset();
    client = new SupermemoryClient('test-key');
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  it('should make a fetch call when storing memory', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '123', status: 'success' })
    });

    await client.storeMemory({
      memoryType: 'observation',
      content: 'Test memory content',
      timestamp: Date.now(),
      contextId: 'test-context'
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.supermemory.local/store',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-key'
        },
        body: expect.any(String)
      }
    );
  });

  it('should handle fetch errors when storing memory', async () => {
    const errorMessage = 'Network error';
    mockFetch.mockRejectedValueOnce(new Error(errorMessage));

    await expect(client.storeMemory({
      memoryType: 'observation',
      content: 'Test memory content',
      timestamp: Date.now(),
      contextId: 'test-context'
    })).rejects.toThrow(errorMessage);
  });
});