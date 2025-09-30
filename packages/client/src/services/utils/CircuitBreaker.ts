/**
 * CircuitBreaker prevents cascading failures by temporarily blocking operations
 * after a threshold of failures is reached.
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 3,
    private readonly resetTimeMs: number = 30000, // 30 seconds
    private readonly name: string = 'unknown'
  ) {}

  /**
   * Executes an operation through the circuit breaker.
   * 
   * @param operation - The async operation to execute
   * @returns Promise resolving to the operation result
   * @throws CircuitBreakerError when circuit is open
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        console.log(`🔧 CircuitBreaker[${this.name}]: Attempting reset (half-open)`);
      } else {
        throw new CircuitBreakerError(`Circuit breaker is open for ${this.name}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
    if (this.state !== 'closed') {
      console.log(`✅ CircuitBreaker[${this.name}]: Reset to closed state`);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.warn(`🚨 CircuitBreaker[${this.name}]: Opened after ${this.failures} failures`);
    } else {
      console.warn(`⚠️ CircuitBreaker[${this.name}]: Failure ${this.failures}/${this.threshold}`);
    }
  }

  private shouldAttemptReset(): boolean {
    const now = Date.now();
    return (now - this.lastFailTime) >= this.resetTimeMs;
  }

  /**
   * Gets the current state of the circuit breaker
   */
  getState(): { state: string; failures: number; lastFailTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime,
    };
  }

  /**
   * Manually resets the circuit breaker to closed state
   */
  reset(): void {
    this.failures = 0;
    this.lastFailTime = 0;
    this.state = 'closed';
    console.log(`🔄 CircuitBreaker[${this.name}]: Manually reset`);
  }

  /**
   * Checks if the circuit breaker is currently blocking operations
   */
  isOpen(): boolean {
    return this.state === 'open' && !this.shouldAttemptReset();
  }
}

/**
 * Error thrown when a circuit breaker is open
 */
export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}