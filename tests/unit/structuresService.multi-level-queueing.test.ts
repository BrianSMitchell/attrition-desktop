/// <reference types="jest" />
import mongoose from 'mongoose';
import { StructuresService } from '../../packages/desktop/src/services/structuresService';
import { Building } from '../models/Building';
import { Empire } from '../models/Empire';
import { Location } from '../models/Location';
import { CapacityService } from '../../packages/desktop/src/services/capacityService';

// Mock dependencies
jest.mock('../models/Empire');
jest.mock('../models/Building');
jest.mock('../models/Location');
jest.mock('../services/capacityService');
jest.mock('../services/baseStatsService');

describe('StructuresService - Multi-level Queueing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all static properties
    (StructuresService as any).didSyncIndexes = false;

    // Provide chainable find().select().lean() (and optional sort().lean()) for energy/scheduling/pop/area paths
    (Building.find as unknown as jest.Mock).mockImplementation((_filter: any) => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    }));
    // Default queued count for per-queue sequence (Q suffix) → 0 so first is Q1
    // Ensure countDocuments exists as a jest.fn so tests can override with mockResolvedValueOnce
    ;(Building as any).countDocuments = jest.fn().mockResolvedValue(0);

    // Default empire stub to ensure save() exists unless overridden in individual tests
    (Empire.findById as unknown as jest.Mock).mockResolvedValue({
      _id: '000000000000000000000001',
      userId: 'user123',
      techLevels: {},
      resources: { credits: 10000 },
      save: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('should allow queuing multiple research labs at different levels', async () => {
    // Mock empire and location
    const mockEmpire = {
      _id: '000000000000000000000001',
      userId: 'user123',
      techLevels: { computer: 5, research_lab: 0 },
      resources: { credits: 10000 },
      save: jest.fn().mockResolvedValue(undefined)
    };
    const mockLocation = {
      coord: 'A00:00:00:00',
      owner: 'user123'
    };

    // Mock first research lab (Level 1)
    const mockBuilding1 = {
      _id: 'building123',
      catalogKey: 'research_labs',
      level: 1,
      isActive: true,
      locationCoord: 'A00:00:00:00',
      empireId: new mongoose.Types.ObjectId('000000000000000000000001'),
      constructionStarted: null,
      constructionCompleted: null
    };

    // Mock capacity for ETA calculation
    const mockCapacity = { construction: { value: 100 } };

    // Setup mocks
    (Empire.findById as jest.Mock).mockResolvedValue(mockEmpire);
    (Location.findOne as jest.Mock).mockResolvedValue(mockLocation);
    (Building.findOne as jest.Mock)
      .mockResolvedValueOnce(null) // First call: no existing building
      .mockResolvedValueOnce(mockBuilding1); // Second call: building exists
    (CapacityService.getBaseCapacities as jest.Mock).mockResolvedValue(mockCapacity);

    // Mock type validation
    (Building.syncIndexes as jest.Mock).mockResolvedValue(undefined);
    (Building.updateOne as jest.Mock).mockResolvedValue({ upsertedId: 'newId123' });
    (Building.findOne as jest.Mock).mockResolvedValue(null);

    // Mock insert document
    const mockInsertDoc = {
      locationCoord: 'A00:00:00:00',
      empireId: new mongoose.Types.ObjectId('000000000000000000000001'),
      type: 'research_lab',
      displayName: 'Research Lab',
      catalogKey: 'research_labs',
      level: 1,
      constructionStarted: expect.any(Date),
      constructionCompleted: expect.any(Date),
      isActive: false,
      creditsCost: expect.any(Number),
      pendingUpgrade: false,
      identityKey: 'empire123:A00:00:00:00:research_labs:L1:Q1' // Level 1, first queued copy identity key
    };

  // Test queuing Research Lab Level 1
  const result1 = await StructuresService.start('000000000000000000000001', 'A00:00:00:00', 'research_labs');

  expect(result1.success).toBe(true);
  expect(result1.message).toContain('construction started');

  // Verify identity key includes level and first sequence
  expect(Building.updateOne).toHaveBeenCalledWith(
      { identityKey: '000000000000000000000001:A00:00:00:00:research_labs:L1:Q1', isActive: false },
      { $setOnInsert: expect.any(Object) },
      { upsert: true }
    );
  });

  it('should allow queuing Research Lab Level 2 upgrade while Level 1 is active', async () => {
    const mockEmpire = {
      _id: '000000000000000000000001',
      userId: 'user123',
      techLevels: { computer: 5, research_lab: 0 },
      resources: { credits: 10000 },
      save: jest.fn().mockResolvedValue(undefined)
    };
    const mockLocation = {
      coord: 'A00:00:00:00',
      owner: 'user123'
    };
    const mockActiveBuilding = {
      _id: 'activeBuilding123',
      catalogKey: 'research_labs',
      level: 1,
      isActive: true,
      locationCoord: 'A00:00:00:00',
      empireId: new mongoose.Types.ObjectId('000000000000000000000001'),
      pendingUpgrade: false
    };
    const mockCapacity = { construction: { value: 100 } };

    // Setup mocks for upgrade scenario
    (Empire.findById as jest.Mock).mockResolvedValue(mockEmpire);
    (Location.findOne as jest.Mock).mockResolvedValue(mockLocation);
    (Building.findOne as jest.Mock).mockResolvedValue(mockActiveBuilding);
    (CapacityService.getBaseCapacities as jest.Mock).mockResolvedValue(mockCapacity);

    (Building.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
    mockEmpire.resources.credits = 10000;
    (mockEmpire as any).save = jest.fn().mockResolvedValue(undefined);

    // Test queuing Research Lab Level 2 (upgrade of Level 1)
    const result = await StructuresService.start('000000000000000000000001', 'A00:00:00:00', 'research_labs');

    expect(result.success).toBe(true);
    expect(result.message).toContain('construction started');

    // Verify Level 2 identity key
    expect(Building.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'activeBuilding123',
        isActive: true,
        $or: [{ pendingUpgrade: { $exists: false } }, { pendingUpgrade: false }],
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          isActive: false,
          pendingUpgrade: true,
          creditsCost: expect.any(Number),
          identityKey: '000000000000000000000001:A00:00:00:00:research_labs:L2',
        }),
      })
    );
  });

  it('should allow duplicate queuing of same building/level via sequence key (Q suffix)', async () => {
    const mockEmpire = {
      _id: '000000000000000000000001',
      userId: 'user123',
      techLevels: { computer: 5, research_lab: 0 },
      resources: { credits: 10000 },
      save: jest.fn().mockResolvedValue(undefined)
    };
    const mockLocation = {
      coord: 'A00:00:00:00',
      owner: 'user123'
    };

    // Mock existing queued building (same level)
    const mockQueuedBuilding = {
      _id: 'queuedBuilding123',
      catalogKey: 'research_labs',
      level: 1,
      isActive: false, // Already queued
      locationCoord: 'A00:00:00:00',
      empireId: new mongoose.Types.ObjectId('000000000000000000000001'),
      constructionStarted: new Date(),
      constructionCompleted: new Date(Date.now() + 60000)
    };

    (Empire.findById as jest.Mock).mockResolvedValue(mockEmpire);
    (Location.findOne as jest.Mock).mockResolvedValue(mockLocation);
    (Building.findOne as jest.Mock).mockResolvedValue(mockQueuedBuilding);
    (Building.countDocuments as unknown as jest.Mock).mockResolvedValue(1); // already one queued -> next seq is Q2
    (Building.updateOne as jest.Mock).mockResolvedValue({ upsertedId: 'queued2' });

    // Attempt to queue the same level again (should succeed with Q2 identity)
    const result = await StructuresService.start('000000000000000000000001', 'A00:00:00:00', 'research_labs');

    expect(result.success).toBe(true);
    expect(result.message).toContain('construction started');
    expect(Building.updateOne).toHaveBeenCalledWith(
      { identityKey: '000000000000000000000001:A00:00:00:00:research_labs:L1:Q2', isActive: false },
      { $setOnInsert: expect.any(Object) },
      { upsert: true }
    );
  });

  it('should assign sequential Q suffixes for multiple queued copies at the same level', async () => {
    const mockEmpire = {
      _id: '000000000000000000000001',
      userId: 'user123',
      techLevels: { computer: 5, research_lab: 0 },
      resources: { credits: 10000 },
      save: jest.fn().mockResolvedValue(undefined)
    };

    (Empire.findById as jest.Mock).mockResolvedValue(mockEmpire);
    (Building.findOne as jest.Mock).mockResolvedValue(null); // No existing active/queued doc impacts level derivation for new construction
    (Location.findOne as jest.Mock).mockResolvedValue({ coord: 'A00:00:00:00', owner: 'user123' });
    (CapacityService.getBaseCapacities as jest.Mock).mockResolvedValue({ construction: { value: 100 } });
    (Building.syncIndexes as jest.Mock).mockResolvedValue(undefined);

    const captured: string[] = [];
    (Building.updateOne as any).mockImplementation((filter: any) => {
      captured.push(filter.identityKey);
      return Promise.resolve({ upsertedId: 'id' + (captured.length) });
    });

    // First queued copy -> Q1
    (Building.countDocuments as unknown as jest.Mock).mockResolvedValueOnce(0);
    await StructuresService.start('000000000000000000000001', 'A00:00:00:00', 'research_labs');

    // Second queued copy -> Q2
    (Building.countDocuments as unknown as jest.Mock).mockResolvedValueOnce(1);
    await StructuresService.start('000000000000000000000001', 'A00:00:00:00', 'research_labs');

    expect(captured[0]).toBe('000000000000000000000001:A00:00:00:00:research_labs:L1:Q1');
    expect(captured[1]).toBe('000000000000000000000001:A00:00:00:00:research_labs:L1:Q2');
  });
});
