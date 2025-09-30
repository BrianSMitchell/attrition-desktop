import { CircuitBreakerConfig, CircuitBreakerState } from './types';

/**
 * CircuitBreaker implements the circuit breaker pattern to prevent cascading failures.
 * It monitors failure rates and temporarily blocks operations when failure threshold is exceeded.
 */
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private failures: number[] = []; // Timestamps of failures
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
    };
  }

  /**
   * Check if an operation can be executed
   */
  canExecute(): boolean {
    this.cleanup(); // Clean old failures

    switch (this.state.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        // Check if we should transition to half-open
        if (this.shouldAttemptReset()) {
          this.state.state = 'HALF_OPEN';
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    // Reset failure count on success
    this.failures = [];
    this.state.failureCount = 0;
    this.state.lastFailureTime = undefined;
    
    // If we were half-open, close the circuit
    if (this.state.state === 'HALF_OPEN') {
      this.state.state = 'CLOSED';
      this.state.nextAttemptTime = undefined;
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.state.failureCount = this.failures.length;
    this.state.lastFailureTime = now;

    // Clean old failures before checking threshold
    this.cleanup();

    // Check if we should open the circuit
    if (this.failures.length >= this.config.failureThreshold) {
      if (this.state.state !== 'OPEN') {
        this.state.state = 'OPEN';
        this.state.nextAttemptTime = now + this.config.resetTimeout;
        console.warn(`🔥 CircuitBreaker: Circuit opened due to ${this.failures.length} failures`);
      }
    }
  }

  /**
   * Get the current state
   */
  getState(): CircuitBreakerState {
    this.cleanup(); // Ensure state is up to date
    return { ...this.state };
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.failures = [];
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
    };
  }

  /**
   * Get failure rate in the monitoring period
   */
  getFailureRate(): number {
    this.cleanup();
    return this.failures.length;
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (this.state.state !== 'OPEN') {
      return false;
    }

    const now = Date.now();
    return !this.state.nextAttemptTime || now >= this.state.nextAttemptTime;
  }

  /**
   * Clean up old failure records outside the monitoring period
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.monitoringPeriod;
    
    // Remove failures outside the monitoring period
    this.failures = this.failures.filter(timestamp => timestamp >= cutoff);
    this.state.failureCount = this.failures.length;

    // If no recent failures and we're open, consider transitioning to half-open
    if (this.failures.length === 0 && this.state.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state.state = 'HALF_OPEN';
        console.log('🔄 CircuitBreaker: Transitioning to HALF_OPEN state');
      }
    }
  }
}