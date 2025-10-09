import { FleetMovementService } from '../services/fleets/FleetMovementService';

/**
 * Fleet Arrival Job
 * 
 * This job processes fleet arrivals by checking for any fleets that should have
 * arrived at their destinations and updating their status and location.
 * 
 * This should be run periodically (e.g., every 5 minutes) as a background job.
 */
export class FleetArrivalJob {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;
  
  /**
   * Start the fleet arrival processing job
   * @param intervalMs - How often to run the job in milliseconds (default: 5 minutes)
   */
  static start(intervalMs: number = 5 * 60 * 1000): void {
    if (this.intervalId) {
      console.log('Fleet arrival job is already running');
      return;
    }
    
    console.log(`Starting fleet arrival job with ${intervalMs}ms interval`);
    
    // Run immediately, then on interval
    this.processArrivals();
    
    this.intervalId = setInterval(() => {
      this.processArrivals();
    }, intervalMs);
  }
  
  /**
   * Stop the fleet arrival processing job
   */
  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Fleet arrival job stopped');
    }
  }
  
  /**
   * Process fleet arrivals (can be called manually)
   */
  static async processArrivals(): Promise<void> {
    if (this.isRunning) {
      console.log('Fleet arrival processing already in progress, skipping...');
      return;
    }
    
    this.isRunning = true;
    
    try {
      console.log('Processing fleet arrivals...');
      const startTime = Date.now();
      
      await FleetMovementService.processArrivals();
      
      const duration = Date.now() - startTime;
      console.log(`Fleet arrival processing completed in ${duration}ms`);
      
    } catch (error) {
      console.error('Error processing fleet arrivals:', error);
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Get job status
   */
  static getStatus() {
    return {
      isScheduled: this.intervalId !== null,
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }
}
