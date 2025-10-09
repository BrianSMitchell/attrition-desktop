import { Location, Empire } from '../../../packages/shared/src/types';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidDebrisState(): R;
      toHaveValidRecyclerSetup(): R;
    }
  }
}

// Custom matchers for debris system testing
expect.extend({
  toHaveValidDebrisState(location: Location) {
    if (!location.debris) {
      return {
        message: () => `Expected location to have debris state, but it was undefined`,
        pass: false
      };
    }

    const { amount, generationRate, recyclers } = location.debris;

    const isValid = 
      typeof amount === 'number' &&
      amount >= 0 &&
      typeof generationRate === 'number' &&
      generationRate >= 0 &&
      Array.isArray(recyclers);

    return {
      message: () => 
        isValid
          ? `Expected location not to have valid debris state`
          : `Expected location to have valid debris state, but found issues:\n` +
            `amount: ${amount}\n` +
            `generationRate: ${generationRate}\n` +
            `recyclers: ${recyclers}`,
      pass: isValid
    };
  },

  toHaveValidRecyclerSetup(location: Location) {
    if (!location.debris?.recyclers) {
      return {
        message: () => `Expected location to have recyclers array, but it was undefined`,
        pass: false
      };
    }

    const { recyclers } = location.debris;
    
    const isValid = recyclers.every(recycler => 
      typeof recycler.empireId === 'string' &&
      recycler.empireId.length > 0 &&
      recycler.startedAt instanceof Date
    );

    return {
      message: () =>
        isValid
          ? `Expected recyclers not to be valid`
          : `Expected all recyclers to have valid setup, but found issues in recyclers array`,
      pass: isValid
    };
  }
});

// Global test helpers
global.createTestLocation = (coord: string): Location => ({
  coord,
  type: 'asteroid',
  properties: {
    fertility: 0,
    resources: {
      metal: 100,
      energy: 100,
      research: 0
    }
  },
  owner: null,
  createdAt: new Date()
});

global.createTestEmpire = (id: string): Empire => ({
  _id: id,
  userId: `user_${id}`,
  name: `Test Empire ${id}`,
  resources: {
    credits: 1000,
    energy: 100
  },
  creditsRemainderMilli: 0,
  baseCount: 1,
  hasDeletedBase: false,
  territories: [],
  createdAt: new Date(),
  updatedAt: new Date()
});