/**
 * Utility class for validating configuration values
 */
export class ConfigValidator {
  /**
   * Validates that a required environment variable exists and has a value
   * @param key - The environment variable key to check
   * @throws Error if the environment variable is missing or empty
   */
  static validateEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  /**
   * Validates that a number is within an acceptable range
   * @param value - The number to validate
   * @param min - Minimum acceptable value (inclusive)
   * @param max - Maximum acceptable value (inclusive)
   * @throws Error if the value is outside the acceptable range
   */
  static validateRange(value: number, min: number, max: number): number {
    if (value < min || value > max) {
      throw new Error(`Value ${value} is outside acceptable range [${min}, ${max}]`);
    }
    return value;
  }
}