const rateLimitBuckets = new Map();

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_LIMIT_WINDOW_MS = parsePositiveInteger(
  process.env.RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000
);
const RATE_LIMIT_MAX = parsePositiveInteger(process.env.RATE_LIMIT_MAX, 3000);
const AUTH_FAILURE_WINDOW_MS = parsePositiveInteger(
  process.env.AUTH_FAILURE_WINDOW_MS,
  15 * 60 * 1000
);
const AUTH_FAILURE_LIMIT = parsePositiveInteger(
  process.env.AUTH_FAILURE_LIMIT,
  20
);

const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'");

  if (
    req.secure ||
    String(req.headers["x-forwarded-proto"] || "").startsWith("https")
  ) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
};

const apiNoStore = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
};

const getBucket = (key, windowMs) => {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 0, resetAt: now + windowMs };
    rateLimitBuckets.set(key, bucket);
    return bucket;
  }

  return existing;
};

const setRateLimitHeaders = (res, bucket, max) => {
  res.setHeader("RateLimit-Limit", String(max));
  res.setHeader(
    "RateLimit-Remaining",
    String(Math.max(0, max - bucket.count))
  );
  res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
};

const createRateLimiter = ({
  scope,
  windowMs,
  max,
  message,
  keyGenerator,
  countFailuresOnly = false
}) => {
  return (req, res, next) => {
    const identity = keyGenerator ? keyGenerator(req) : req.ip;
    const key = `${scope}:${identity}`;
    const bucket = getBucket(key, windowMs);

    setRateLimitHeaders(res, bucket, max);

    if (bucket.count >= max) {
      const retryAfter = Math.max(
        1,
        Math.ceil((bucket.resetAt - Date.now()) / 1000)
      );

      res.setHeader("Retry-After", String(retryAfter));

      return res.status(429).json({
        success: false,
        message
      });
    }

    if (countFailuresOnly) {
      res.on("finish", () => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
          const failedBucket = getBucket(key, windowMs);
          failedBucket.count += 1;
        } else if (res.statusCode < 400) {
          rateLimitBuckets.delete(key);
        }
      });

      next();
      return;
    }

    bucket.count += 1;
    setRateLimitHeaders(res, bucket, max);
    next();
  };
};

const apiRateLimiter = createRateLimiter({
  scope: "api",
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: "Too many requests. Please try again later."
});

const authFailureRateLimiter = createRateLimiter({
  scope: "auth",
  windowMs: AUTH_FAILURE_WINDOW_MS,
  max: AUTH_FAILURE_LIMIT,
  message: "Too many failed attempts. Please try again later.",
  countFailuresOnly: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    return `${req.ip}:${email}`;
  }
});

const cleanupTimer = setInterval(() => {
  const now = Date.now();

  rateLimitBuckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  });
}, 5 * 60 * 1000);

if (typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref();
}

module.exports = {
  apiNoStore,
  apiRateLimiter,
  authFailureRateLimiter,
  securityHeaders
};
