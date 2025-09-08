/**
 * Balance and Performance Testing Setup
 * 
 * This file configures the testing environment specifically for game balance
 * and performance testing scenarios, including database setup, performance
 * monitoring, and resource cleanup.
 */

import mongoose from 'mongoose';

// Performance monitoring setup
let performanceStartTime: number;
let memoryUsageStart: NodeJS.MemoryUsage;

beforeAll(async () => {
  // Setup performance monitoring
  performanceStartTime = Date.now();
  memoryUsageStart = process.memoryUsage();

  // Configure test database
  const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/attrition-test-balance';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testDbUri, {
      maxPoolSize: 20, // Increased pool size for concurrent tests
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0
    });
  }

  console.log('🧪 Balance & Performance test environment initialized');
  console.log(`📊 Initial memory usage: ${JSON.stringify(memoryUsageStart)}`);
});

afterAll(async () => {
  // Performance reporting
  const performanceEndTime = Date.now();
  const memoryUsageEnd = process.memoryUsage();
  const testDuration = performanceEndTime - performanceStartTime;

  console.log('\n📈 Balance & Performance Test Session Summary:');
  console.log(`⏱️  Total test duration: ${testDuration}ms`);
  console.log(`💾 Memory usage delta: ${JSON.stringify({
    rss: memoryUsageEnd.rss - memoryUsageStart.rss,
    heapUsed: memoryUsageEnd.heapUsed - memoryUsageStart.heapUsed,
    heapTotal: memoryUsageEnd.heapTotal - memoryUsageStart.heapTotal
  })}`);

  // Check for potential memory leaks
  const memoryIncrease = memoryUsageEnd.heapUsed - memoryUsageStart.heapUsed;
  const memoryLeakThreshold = 100 * 1024 * 1024; // 100MB
  
  if (memoryIncrease > memoryLeakThreshold) {
    console.warn(`⚠️  Potential memory leak detected: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase`);
  }

  // Clean up database connections
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  console.log('🧹 Balance & Performance test environment cleaned up');
});

beforeEach(async () => {
  // Clean up test data before each test
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    
    await Promise.all(
      Object.values(collections).map(collection => 
        collection.deleteMany({
          $or: [
            { userId: { $regex: /test-|perf-test-|balance-test-/ } },
            { coord: { $regex: /TEST:|PERF:|BALANCE:/ } },
            { identityKey: { $regex: /test-|perf-test-|balance-test-/ } }
          ]
        })
      )
    );
  }
});

afterEach(() => {
  // Force garbage collection after each test if available
  if (global.gc) {
    global.gc();
  }
});

// Global error handlers for balance and performance tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in test environment
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in test environment
});

// Export utilities for balance and performance testing
export const BalanceTestUtils = {
  /**
   * Monitor memory usage during a test operation
   */
  async monitorMemoryUsage<T>(operation: () => Promise<T>): Promise<{ result: T; memoryDelta: number }> {
    const memoryBefore = process.memoryUsage();
    const result = await operation();
    const memoryAfter = process.memoryUsage();
    
    const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
    
    return { result, memoryDelta };
  },

  /**
   * Measure execution time of an operation
   */
  async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    
    return { result, duration };
  },

  /**
   * Run an operation multiple times and collect performance statistics
   */
  async collectPerformanceStats<T>(
    operation: () => Promise<T>,
    iterations: number = 10
  ): Promise<{
    results: T[];
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalMemoryDelta: number;
  }> {
    const results: T[] = [];
    const times: number[] = [];
    let totalMemoryDelta = 0;

    for (let i = 0; i < iterations; i++) {
      const memoryBefore = process.memoryUsage();
      const startTime = Date.now();
      
      const result = await operation();
      
      const endTime = Date.now();
      const memoryAfter = process.memoryUsage();
      
      results.push(result);
      times.push(endTime - startTime);
      totalMemoryDelta += memoryAfter.heapUsed - memoryBefore.heapUsed;

      // Small delay between iterations to allow garbage collection
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return {
      results,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      totalMemoryDelta
    };
  },

  /**
   * Create a test empire with predictable performance characteristics
   */
  async createPerformanceTestEmpire(options: {
    userId?: string;
    buildingCount?: number;
    techLevels?: Map<string, number>;
    resourceAmount?: number;
  }) {
    const empireId = new mongoose.Types.ObjectId().toString();
    const userId = options.userId || `perf-test-${empireId}`;
    const locationCoord = `PERF-TEST:${empireId}:${Date.now()}`;

    // Use dynamic imports to avoid circular dependencies
    const { Empire } = await import('../../models/Empire');
    const { Location } = await import('../../models/Location');
    const { Building } = await import('../../models/Building');

    const empire = new Empire({
      _id: empireId,
      userId,
      name: `Performance Test Empire`,
      territories: [locationCoord],
      baseCount: 1,
      hasDeletedBase: false,
      resources: {
        credits: options.resourceAmount || 100000,
        energy: options.resourceAmount ? options.resourceAmount / 2 : 50000
      },
      techLevels: options.techLevels || new Map([
        ['energy', 3],
        ['computer', 2],
        ['cybernetics', 1]
      ]),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await empire.save();

    const location = new Location({
      coord: locationCoord,
      owner: userId,
      name: `Performance Test Location`,
      createdAt: new Date(),
      result: {
        yields: { metal: 3 },
        fertility: 2
      },
      positionBase: {
        solarEnergy: 4
      }
    });

    await location.save();

    // Create buildings if specified
    const buildingCount = options.buildingCount || 5;
    const buildingTypes = ['urban_structures', 'research_labs', 'robotic_factories', 'shipyards', 'metal_refineries'];
    
    for (let i = 0; i < buildingCount; i++) {
      const buildingType = buildingTypes[i % buildingTypes.length];
      const building = new Building({
        empireId: new mongoose.Types.ObjectId(empireId),
        locationCoord: locationCoord,
        catalogKey: buildingType,
        buildingKey: buildingType,
        level: Math.min(5, Math.floor(i / 2) + 1),
        isActive: true,
        identityKey: `${empireId}:${locationCoord}:${buildingType}:${i}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await building.save();
    }

    return {
      empireId,
      userId,
      locationCoord,
      cleanup: async () => {
        await Promise.all([
          Empire.deleteMany({ _id: empireId }),
          Location.deleteMany({ coord: locationCoord }),
          Building.deleteMany({ empireId: new mongoose.Types.ObjectId(empireId) })
        ]);
      }
    };
  }
};

// Make utilities available globally for test files
declare global {
  var BalanceTestUtils: typeof BalanceTestUtils;
}

global.BalanceTestUtils = BalanceTestUtils;
