import { TooManyRequestsError } from '../../errors.js';

const MAX_TRACKED_CLIENTS = 1000;

/** Fixed-window rate limiter keyed by x-user-id (or the client address). */
export function rateLimiter({ maxRequests = 60, windowMs = 60000, now = Date.now } = {}) {
  const buckets = new Map();

  function purgeExpired(current) {
    for (const [key, bucket] of buckets) {
      if (current - bucket.start >= windowMs) buckets.delete(key);
    }
  }

  return async function rateLimiterMiddleware(ctx, next) {
    const current = now();
    if (buckets.size > MAX_TRACKED_CLIENTS) purgeExpired(current);
    const key = String(ctx.request.headers['x-user-id'] ?? ctx.req.socket.remoteAddress);
    const bucket = buckets.get(key);
    if (!bucket || current - bucket.start >= windowMs) buckets.set(key, { start: current, count: 1 });
    else bucket.count += 1;
    if (buckets.get(key).count > maxRequests) {
      throw new TooManyRequestsError(`Rate limit exceeded: max ${maxRequests} requests per ${windowMs / 1000}s.`);
    }
    await next();
  };
}
