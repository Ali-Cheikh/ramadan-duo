import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRate = applyRateLimit(`push:public-key:${ip}`, 120, 60_000);
  if (!ipRate.allowed) {
    return rateLimitResponse(ipRate.retryAfterSec);
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();

  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID public key is missing' }, { status: 500 });
  }

  return NextResponse.json({ publicKey });
}
