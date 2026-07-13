/**
 * Rate limiting middleware to prevent brute force attacks
 */

const rateLimitStore = new Map();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_REQUESTS = 100; // 100 requests per window

/**
 * Create a rate limiter middleware
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.keyPrefix - Prefix for rate limit keys
 */
function rateLimiter(options = {}) {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
    keyPrefix = 'rl'
  } = options;

  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.startTime > windowMs) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    // Get client identifier (IP address or user ID)
    const clientId = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${clientId}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now - record.startTime > windowMs) {
      // Create new record
      record = {
        startTime: now,
        count: 1
      };
      rateLimitStore.set(key, record);
    } else {
      // Increment count
      record.count++;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.startTime + windowMs) / 1000));

    // Check if limit exceeded
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((record.startTime + windowMs - now) / 1000)
      });
    }

    next();
  };
}

/**
 * Strict rate limiter for authentication endpoints
 */
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyPrefix: 'auth'
});

/**
 * General API rate limiter
 */
const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  keyPrefix: 'api'
});

module.exports = {
  rateLimiter,
  authRateLimiter,
  apiRateLimiter
};
