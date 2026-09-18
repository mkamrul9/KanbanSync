import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client using environment variables
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
export const redis = Redis.fromEnv();

// Helper to create a sliding window rate limiter
export function createRateLimiter(requests: number, window: `${number} s` | `${number} m` | `${number} h` | `${number} d`) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

// Common rate limiters for the application
export const rateLimiters = {
  // 10 requests per minute for board creation
  createBoard: createRateLimiter(10, '1 m'),
  // 100 requests per minute for task creation
  createTask: createRateLimiter(100, '1 m'),
  // 30 requests per minute for AI generation
  generateAI: createRateLimiter(30, '1 m'),
  // 5 requests per hour for signup (IP based)
  signUp: createRateLimiter(5, '1 h'),
};

/**
 * Convenience function to check rate limits using standard structure
 * @param limiter The rate limiter to use
 * @param identifier The unique identifier (e.g., user ID or IP address)
 * @returns Object indicating success and rate limit info
 */
export async function checkRateLimit(limiter: Ratelimit, identifier: string) {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return { 
      success, 
      limit, 
      remaining, 
      reset,
      error: success ? undefined : 'Rate limit exceeded. Please try again later.' 
    };
  } catch (error) {
    // Fail open if Redis is unavailable or misconfigured, rather than breaking the app
    console.error('Rate limiting error:', error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}
