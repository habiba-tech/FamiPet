// -------------------------------------------------
// SIMPLE IN-MEMORY RATE LIMITER
// -------------------------------------------------
// Minimal fixed-window limiter per IP + route prefix.
// Guards sensitive endpoints (auth, AI) against brute
// force / abuse without adding a third-party dependency.
//
// NOTE: state is per-process; with multiple instances
// each node throttles independently. Fine for this
// single-process deployment.

const limiterBuckets = new Map();

const defaultOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: "Too many requests, please try again later.",
  statusCode: 429,
};

const rateLimiter = (options = {}) => {
  const opts = { ...defaultOptions, ...options };
  const keyFor = (req) => `${req.ip || "unknown"}:${req.baseUrl || ""}${req.path || ""}`;

  const cleanup = () => {
    const now = Date.now();
    for (const [key, bucket] of limiterBuckets.entries()) {
      if (now - bucket.resetAt > opts.windowMs) {
        limiterBuckets.delete(key);
      }
    }
  };

  return (req, res, next) => {
    const key = keyFor(req);
    const now = Date.now();
    const bucket = limiterBuckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      limiterBuckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    if (bucket.count >= opts.max) {
      // Opportunistic cleanup to avoid unbounded growth.
      cleanup();
      return res.status(opts.statusCode).json({
        success: false,
        message: opts.message,
      });
    }

    bucket.count += 1;
    return next();
  };
};

module.exports = rateLimiter;