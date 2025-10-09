import { ConfigValidator } from '../../utils/ConfigValidator';

describe('ConfigValidator', () => {
  describe('validateEnvVar', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      // Clear and reset environment variables before each test
      (process as any).env = { ...originalEnv };
    });

    afterAll(() => {
      // Restore original environment after all tests
      (process as any).env = originalEnv as any;
    });

    it('should return value when environment variable exists', () => {
      // Arrange
      (process as any).env.TEST_VAR = 'test-value';

      // Act
      const result = ConfigValidator.validateEnvVar('TEST_VAR');

      // Assert
      expect(result).toBe('test-value');
    });

    it('should throw error when environment variable is missing', () => {
      // Act & Assert
      expect(() => {
        ConfigValidator.validateEnvVar('MISSING_VAR');
      }).toThrow('Missing required environment variable: MISSING_VAR');
    });

    it('should throw error when environment variable is empty', () => {
      // Arrange
      (process as any).env.EMPTY_VAR = '';

      // Act & Assert
      expect(() => {
        ConfigValidator.validateEnvVar('EMPTY_VAR');
      }).toThrow('Missing required environment variable: EMPTY_VAR');
    });
  });

  describe('validateRange', () => {
    it('should return value when within acceptable range', () => {
      // Act
      const result = ConfigValidator.validateRange(5, 0, 10);

      // Assert
      expect(result).toBe(5);
    });

    it('should accept value at minimum bound', () => {
      // Act
      const result = ConfigValidator.validateRange(0, 0, 10);

      // Assert
      expect(result).toBe(0);
    });

    it('should accept value at maximum bound', () => {
      // Act
      const result = ConfigValidator.validateRange(10, 0, 10);

      // Assert
      expect(result).toBe(10);
    });

    it('should throw error when value is below minimum', () => {
      // Act & Assert
      expect(() => {
        ConfigValidator.validateRange(-1, 0, 10);
      }).toThrow('Value -1 is outside acceptable range [0, 10]');
    });

    it('should throw error when value is above maximum', () => {
      // Act & Assert
      expect(() => {
        ConfigValidator.validateRange(11, 0, 10);
      }).toThrow('Value 11 is outside acceptable range [0, 10]');
    });
  });
});