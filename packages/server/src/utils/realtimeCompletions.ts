import { hybridGameLoop } from '../services/hybridGameLoopService';

/**
 * Check for immediate completions when a user takes an action
 * Call this in API endpoints where users are actively playing
 */
export async function checkUserCompletions(empireId: string): Promise<void> {
  try {
    await hybridGameLoop.checkUserCompletions(empireId);
  } catch (error) {
    console.error(`Error checking real-time completions for empire ${empireId}:`, error);
    // Don't throw - this is a nice-to-have feature, shouldn't break API calls
  }
}

/**
 * Middleware to automatically check completions for authenticated users
 */
export function withRealtimeCompletions() {
  return async (req: any, res: any, next: any) => {
    // If user is authenticated and has an empire, check their completions
    if (req.user?.empireId) {
      // Don't await - run in background to not slow down API response
      checkUserCompletions(req.user.empireId.toString()).catch(console.error);
    }
    next();
  };
}