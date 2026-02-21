import { NextRequest, NextResponse } from 'next/server';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

type GlobalRateLimitStore = {
  buckets: Map<string, RateLimitBucket>;
};

declare global {
  var __ramadanQuestRateLimitStore: GlobalRateLimitStore | undefined;
}

const globalStore =
  globalThis.__ramadanQuestRateLimitStore ??
  (globalThis.__ramadanQuestRateLimitStore = {
    buckets: new Map<string, RateLimitBucket>(),
  });

function cleanupExpiredBuckets(now: number) {
  if (globalStore.buckets.size < 1000) return;

  for (const [key, bucket] of Array.from(globalStore.buckets.entries())) {
    if (bucket.resetAt <= now) {
      globalStore.buckets.delete(key);
    }
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

export function applyRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const current = globalStore.buckets.get(key);

  if (!current || current.resetAt <= now) {
    globalStore.buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSec: Math.ceil(windowMs / 1000),
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  globalStore.buckets.set(key, current);

  return {
    allowed: true,
    remaining: limit - current.count,
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}
