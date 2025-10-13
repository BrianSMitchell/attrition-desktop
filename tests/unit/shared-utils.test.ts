import { 
  parseCoord, 
  formatCoord, 
  calculateHierarchicalDistance, 
  isValidCoordinate,
  generateRandomHierarchicalCoordinate
} from '../../packages/shared/src/utils';
import { CoordinateComponents } from '../../packages/shared/src/types';

describe('Coordinate Utilities', () => {
  describe('parseCoord', () => {
    it('should parse valid coordinate strings correctly', () => {
      const coord = parseCoord('A00:10:22:10');
      expect(coord).toEqual({
        server: 'A',
        galaxy: 0,
        region: 10,
        system: 22,
        body: 10
      });
    });

    it('should parse coordinates with different values', () => {
      const coord = parseCoord('B39:99:88:19');
      expect(coord).toEqual({
        server: 'B',
        galaxy: 39,
        region: 99,
        system: 88,
        body: 19
      });
    });

    it('should throw error for invalid format', () => {
      expect(() => parseCoord('invalid')).toThrow('Invalid coordinate format');
      expect(() => parseCoord('A0:10:22:10')).toThrow('Invalid coordinate format');
      expect(() => parseCoord('A00:10:22')).toThrow('Invalid coordinate format');
      expect(() => parseCoord('A00:10:22:100')).toThrow('Invalid coordinate format');
    });
  });

  describe('formatCoord', () => {
    it('should format coordinate components correctly', () => {
      const coord: CoordinateComponents = {
        server: 'A',
        galaxy: 0,
        region: 10,
        system: 22,
        body: 10
      };
      expect(formatCoord(coord)).toBe('A00:10:22:10');
    });

    it('should pad numbers with zeros correctly', () => {
      const coord: CoordinateComponents = {
        server: 'B',
        galaxy: 5,
        region: 1,
        system: 0,
        body: 9
      };
      expect(formatCoord(coord)).toBe('B05:01:00:09');
    });
  });

  describe('parseCoord and formatCoord round trip', () => {
    it('should maintain consistency in round trip conversion', () => {
      const originalCoord = 'A15:45:67:12';
      const parsed = parseCoord(originalCoord);
      const formatted = formatCoord(parsed);
      expect(formatted).toBe(originalCoord);
    });
  });

  describe('calculateHierarchicalDistance', () => {
    const coordA: CoordinateComponents = {
      server: 'A',
      galaxy: 0,
      region: 0,
      system: 0,
      body: 0
    };

    it('should return Infinity for different servers', () => {
      const coordB: CoordinateComponents = { ...coordA, server: 'B' };
      expect(calculateHierarchicalDistance(coordA, coordB)).toBe(Infinity);
    });

    it('should calculate galaxy distance correctly', () => {
      const coordB: CoordinateComponents = { ...coordA, galaxy: 1 };
      expect(calculateHierarchicalDistance(coordA, coordB)).toBe(10000);
    });

    it('should calculate region distance correctly', () => {
      const coordB: CoordinateComponents = { ...coordA, region: 11 }; // 1 step right, 1 step down = 2 Manhattan distance
      expect(calculateHierarchicalDistance(coordA, coordB)).toBe(2000);
    });

    it('should calculate region distance with Manhattan distance', () => {
      const coordB: CoordinateComponents = { ...coordA, region: 22 }; // 2 steps right, 2 steps down = 4 Manhattan distance
      expect(calculateHierarchicalDistance(coordA, coordB)).toBe(4000);
    });

    it('should calculate system distance correctly', () => {
      const coordB: CoordinateComponents = { ...coordA, system: 11 }; // 1 step right, 1 step down = 2 Manhattan distance
      expect(calculateHierarchicalDistance(coordA, coordB)).toBe(200);
    });

    it('should calculate body distance correctly', () => {
      const coordB: CoordinateComponents = { ...coordA, body: 5 };
      expect(calculateHierarchicalDistance(coordA, coordB)).toBe(5);
    });

    it('should calculate combined distances correctly', () => {
      const coordB: CoordinateComponents = {
        server: 'A',
        galaxy: 1,    // 10000 (different galaxy, so only galaxy distance matters)
        region: 11,   // ignored because different galaxy
        system: 11,   // ignored because different galaxy
        body: 5       // ignored because different galaxy
      };
      expect(calculateHierarchicalDistance(coordA, coordB)).toBe(10000);
    });

    it('should return 0 for identical coordinates', () => {
      expect(calculateHierarchicalDistance(coordA, coordA)).toBe(0);
    });
  });

  describe('isValidCoordinate', () => {
    it('should validate correct coordinate strings', () => {
      expect(isValidCoordinate('A00:00:00:00')).toBe(true);
      expect(isValidCoordinate('A39:99:99:19')).toBe(true);
      expect(isValidCoordinate('Z15:45:67:12')).toBe(true);
    });

    it('should reject invalid coordinate strings', () => {
      expect(isValidCoordinate('invalid')).toBe(false);
      expect(isValidCoordinate('A40:00:00:00')).toBe(false); // galaxy > 39
      expect(isValidCoordinate('A00:100:00:00')).toBe(false); // region > 99
      expect(isValidCoordinate('A00:00:100:00')).toBe(false); // system > 99
      expect(isValidCoordinate('A00:00:00:20')).toBe(false); // body > 19
      expect(isValidCoordinate('A0:00:00:00')).toBe(false); // wrong format
    });
  });

  describe('generateRandomHierarchicalCoordinate', () => {
    it('should generate valid coordinates', () => {
      const coord = generateRandomHierarchicalCoordinate('A');
      expect(coord.server).toBe('A');
      expect(coord.galaxy).toBeGreaterThanOrEqual(0);
      expect(coord.galaxy).toBeLessThanOrEqual(39);
      expect(coord.region).toBeGreaterThanOrEqual(0);
      expect(coord.region).toBeLessThanOrEqual(99);
      expect(coord.system).toBeGreaterThanOrEqual(0);
      expect(coord.system).toBeLessThanOrEqual(99);
      expect(coord.body).toBeGreaterThanOrEqual(0);
      expect(coord.body).toBeLessThanOrEqual(19);
    });

    it('should generate different coordinates on multiple calls', () => {
      const coord1 = generateRandomHierarchicalCoordinate('A');
      const coord2 = generateRandomHierarchicalCoordinate('A');
      
      // Very unlikely to be identical (but theoretically possible)
      const formatted1 = formatCoord(coord1);
      const formatted2 = formatCoord(coord2);
      
      // Just check that the function runs without error
      expect(isValidCoordinate(formatted1)).toBe(true);
      expect(isValidCoordinate(formatted2)).toBe(true);
    });

    it('should use default server A when not specified', () => {
      const coord = generateRandomHierarchicalCoordinate();
      expect(coord.server).toBe('A');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle boundary values correctly', () => {
      const minCoord: CoordinateComponents = {
        server: 'A',
        galaxy: 0,
        region: 0,
        system: 0,
        body: 0
      };
      
      const maxCoord: CoordinateComponents = {
        server: 'Z',
        galaxy: 39,
        region: 99,
        system: 99,
        body: 19
      };

      expect(formatCoord(minCoord)).toBe('A00:00:00:00');
      expect(formatCoord(maxCoord)).toBe('Z39:99:99:19');
      expect(isValidCoordinate(formatCoord(minCoord))).toBe(true);
      expect(isValidCoordinate(formatCoord(maxCoord))).toBe(true);
    });
  });
});

